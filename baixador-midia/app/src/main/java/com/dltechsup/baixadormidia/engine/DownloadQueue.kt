package com.dltechsup.baixadormidia.engine

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import com.dltechsup.baixadormidia.data.DownloadSpec
import com.dltechsup.baixadormidia.data.JobStatus
import com.dltechsup.baixadormidia.data.JobUi
import com.dltechsup.baixadormidia.data.isActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

/** Fila de downloads: o WorkManager executa, e este objeto guarda o estado para a interface. */
object DownloadQueue {
    private val _jobs = MutableStateFlow<List<JobUi>>(emptyList())
    val jobs: StateFlow<List<JobUi>> = _jobs

    fun enqueue(ctx: Context, spec: DownloadSpec): String {
        val id = UUID.randomUUID().toString()
        _jobs.update { listOf(JobUi(id, spec)) + it }
        start(ctx, id, spec)
        return id
    }

    private fun start(ctx: Context, id: String, spec: DownloadSpec) {
        val request = OneTimeWorkRequestBuilder<DownloadWorker>()
            .setInputData(spec.toData(id))
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .addTag(TAG)
            .addTag("job:$id")
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork("dl-$id", ExistingWorkPolicy.REPLACE, request)
    }

    fun cancel(ctx: Context, id: String) {
        WorkManager.getInstance(ctx).cancelAllWorkByTag("job:$id")
        // Se o item ainda estava na fila (o worker nem começou), o worker não vai marcar como cancelado.
        update(id) { if (it.status == JobStatus.QUEUED) it.copy(status = JobStatus.CANCELLED) else it }
        Notifications.cancel(ctx, id)
    }

    fun retry(ctx: Context, id: String) {
        val job = _jobs.value.firstOrNull { it.id == id } ?: return
        update(id) { it.copy(status = JobStatus.QUEUED, percent = 0f, speed = "", etaSec = -1, error = null) }
        start(ctx, id, job.spec)
    }

    fun remove(id: String) = _jobs.update { list -> list.filterNot { it.id == id } }

    fun clearFinished() = _jobs.update { list -> list.filter { it.status.isActive } }

    internal fun update(id: String, change: (JobUi) -> JobUi) =
        _jobs.update { list -> list.map { if (it.id == id) change(it) else it } }

    const val TAG = "download"
}
