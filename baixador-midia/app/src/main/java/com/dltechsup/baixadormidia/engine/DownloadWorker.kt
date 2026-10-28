package com.dltechsup.baixadormidia.engine

import android.app.Notification
import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.dltechsup.baixadormidia.data.DownloadSpec
import com.dltechsup.baixadormidia.data.HistoryItem
import com.dltechsup.baixadormidia.data.HistoryRepository
import com.dltechsup.baixadormidia.data.JobStatus
import com.dltechsup.baixadormidia.data.MediaSaver
import com.yausername.youtubedl_android.YoutubeDL
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.withContext
import java.io.File

/** Baixa um item em segundo plano, com notificação de progresso (serviço em primeiro plano). */
class DownloadWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    private val jobId = inputData.getString(DownloadSpec.K_ID).orEmpty()
    private val spec = DownloadSpec.fromData(inputData)

    private fun foreground(percent: Float, text: String): ForegroundInfo {
        val notification: Notification = Notifications.progress(applicationContext, id, spec.title, percent, text)
        val nid = Notifications.notificationId(jobId)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(nid, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(nid, notification)
        }
    }

    // Usado pelo WorkManager quando o trabalho é "expedited" em versões antigas do Android.
    override suspend fun getForegroundInfo(): ForegroundInfo = foreground(0f, "Preparando…")

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val processId = "job-$jobId"
        val temp = File(ctx.cacheDir, "dl/$jobId").apply { deleteRecursively(); mkdirs() }

        // Se o WorkManager cancelar este trabalho, mata o processo do yt-dlp.
        val handle = currentCoroutineContext()[Job]?.invokeOnCompletion { cause ->
            if (cause is CancellationException) YoutubeDL.destroyProcessById(processId)
        }

        try {
            DownloadQueue.update(jobId) { it.copy(status = JobStatus.DOWNLOADING, percent = 0f) }
            runCatching { setForeground(foreground(0f, "Preparando…")) } // pode falhar em segundo plano no Android 12+; o download segue

            val notifier = ctx.getSystemService(android.app.NotificationManager::class.java)
            val nid = Notifications.notificationId(jobId)
            var lastUi = 0L

            withContext(Dispatchers.IO) {
                Engine.ensure(ctx)
                YoutubeDL.execute(Engine.buildRequest(spec, temp), processId) { progress, eta, line ->
                    val processing = line.contains("[ExtractAudio]") || line.contains("[Merger]") ||
                        line.contains("[EmbedThumbnail]") || line.contains("[Metadata]") || line.contains("[VideoConvertor]")
                    val now = System.currentTimeMillis()
                    if (processing) {
                        DownloadQueue.update(jobId) { it.copy(status = JobStatus.PROCESSING, percent = 100f, speed = "", etaSec = -1) }
                        runCatching { notifier.notify(nid, Notifications.progress(ctx, id, spec.title, 100f, "Convertendo…")) }
                    } else if (progress >= 0f && now - lastUi > 400) {
                        lastUi = now
                        val speed = SPEED.find(line)?.groupValues?.get(1).orEmpty()
                        DownloadQueue.update(jobId) {
                            it.copy(status = JobStatus.DOWNLOADING, percent = progress, speed = speed, etaSec = eta)
                        }
                        val text = "Baixando ${progress.toInt()}%" + (if (speed.isNotEmpty()) " · $speed" else "")
                        runCatching { notifier.notify(nid, Notifications.progress(ctx, id, spec.title, progress, text)) }
                    }
                }
            }

            DownloadQueue.update(jobId) { it.copy(status = JobStatus.SAVING, percent = 100f, speed = "", etaSec = -1) }
            val settingsFolder = spec.folderName
            val saved = withContext(Dispatchers.IO) {
                val file = Engine.pickResult(temp, spec) ?: error("O arquivo final não foi encontrado.")
                MediaSaver.save(ctx, file, spec.mode, settingsFolder)
            }
            HistoryRepository.add(
                ctx,
                HistoryItem(
                    id = jobId,
                    title = spec.title,
                    author = spec.author,
                    uri = saved.uri.toString(),
                    path = saved.path,
                    mime = saved.mime,
                    mode = spec.mode,
                    sizeBytes = saved.size,
                    dateMillis = System.currentTimeMillis(),
                    sourceUrl = spec.url,
                    thumbnail = spec.thumbnail,
                ),
            )
            DownloadQueue.update(jobId) { it.copy(status = JobStatus.DONE, percent = 100f) }
            Notifications.finished(ctx, jobId, "Download concluído", spec.title)
            return Result.success()
        } catch (e: CancellationException) {
            DownloadQueue.update(jobId) { it.copy(status = JobStatus.CANCELLED) }
            throw e
        } catch (e: Throwable) {
            if (isStopped || e is YoutubeDL.CanceledException) {
                DownloadQueue.update(jobId) { it.copy(status = JobStatus.CANCELLED) }
            } else {
                val message = Engine.friendlyError(e)
                DownloadQueue.update(jobId) { it.copy(status = JobStatus.ERROR, error = message) }
                Notifications.finished(ctx, jobId, "Falha no download", "${spec.title}: $message")
            }
            return Result.failure()
        } finally {
            handle?.dispose()
            temp.deleteRecursively()
        }
    }

    private companion object {
        val SPEED = Regex("""at\s+([\d.,]+\s?[KMG]?i?B/s)""")
    }
}
