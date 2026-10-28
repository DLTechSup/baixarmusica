package com.dltechsup.baixadormidia.engine

import android.content.Context
import com.dltechsup.baixadormidia.data.AudioFormat
import com.dltechsup.baixadormidia.data.DownloadSpec
import com.dltechsup.baixadormidia.data.MediaInfo
import com.dltechsup.baixadormidia.data.Mode
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import java.io.File

sealed interface EngineState {
    data object Starting : EngineState
    data object Ready : EngineState
    data class Failed(val message: String) : EngineState
}

/** Ponte com o youtubedl-android (yt-dlp + Python + FFmpeg empacotados no APK). */
object Engine {
    private val _state = MutableStateFlow<EngineState>(EngineState.Starting)
    val state: StateFlow<EngineState> = _state

    /** Inicializa o motor (idempotente). A primeira execução extrai os arquivos e demora alguns segundos. */
    @Synchronized
    fun ensure(ctx: Context) {
        if (_state.value == EngineState.Ready) return
        try {
            _state.value = EngineState.Starting
            YoutubeDL.init(ctx.applicationContext)
            FFmpeg.init(ctx.applicationContext)
            _state.value = EngineState.Ready
        } catch (t: Throwable) {
            _state.value = EngineState.Failed(friendlyError(t))
            throw t
        }
    }

    suspend fun fetchInfo(ctx: Context, url: String): MediaInfo = withContext(Dispatchers.IO) {
        ensure(ctx)
        val request = YoutubeDLRequest(url).apply {
            addOption("--no-playlist")
            addOption("--no-warnings")
        }
        val info = YoutubeDL.getInfo(request)
        MediaInfo(
            url = url,
            title = info.title ?: info.fulltitle ?: "Sem título",
            author = info.uploader ?: "",
            durationSec = info.duration,
            thumbnail = info.thumbnail ?: info.thumbnails?.lastOrNull()?.url,
        )
    }

    /** Monta os parâmetros do yt-dlp. Os arquivos saem em [tempDir]; depois o app move para Download/. */
    fun buildRequest(spec: DownloadSpec, tempDir: File): YoutubeDLRequest {
        val request = YoutubeDLRequest(spec.url).apply {
            addOption("--no-playlist")
            addOption("--no-mtime")
            addOption("--no-warnings")
            addOption("--windows-filenames")
            addOption("--embed-metadata")
            addOption("-P", tempDir.absolutePath)
            addOption("-o", "%(title).150B.%(ext)s")
        }
        when (spec.mode) {
            Mode.AUDIO -> {
                request.addOption("-f", "bestaudio/best")
                request.addOption("-x")
                request.addOption("--audio-format", spec.audioFormat.ext)
                request.addOption("--audio-quality", if (spec.audioFormat == AudioFormat.MP3) "320K" else "0")
                request.addOption("--embed-thumbnail")
                request.addOption("--convert-thumbnails", "jpg")
                // Se o vídeo não tiver "artista", usa o nome do canal/autor.
                request.addOption("--parse-metadata", "%(artist,uploader)s:%(meta_artist)s")
            }
            Mode.VIDEO -> {
                val cap = if (spec.videoHeight > 0) "[height<=${spec.videoHeight}]" else ""
                request.addOption("-f", "bv*$cap+ba/b$cap/bv*+ba/b")
                request.addOption("-S", "vcodec:h264,res,acodec:m4a") // prefere H.264/AAC: toca em qualquer aparelho
                request.addOption("--merge-output-format", "mp4")
            }
        }
        return request
    }

    /** Escolhe o arquivo final na pasta temporária, ignorando miniaturas e restos de download. */
    fun pickResult(tempDir: File, spec: DownloadSpec): File? {
        val media = setOf("mp3", "m4a", "mp4", "mkv", "webm", "opus", "aac", "ogg")
        val files = tempDir.listFiles { f -> f.isFile && f.extension.lowercase() in media } ?: return null
        val wanted = if (spec.mode == Mode.AUDIO) spec.audioFormat.ext else "mp4"
        return files.sortedWith(compareByDescending<File> { it.extension.lowercase() == wanted }.thenByDescending { it.length() }).firstOrNull()
    }

    suspend fun update(ctx: Context): String = withContext(Dispatchers.IO) {
        ensure(ctx)
        val status = YoutubeDL.updateYoutubeDL(ctx.applicationContext)
        when (status) {
            YoutubeDL.UpdateStatus.DONE -> "Motor atualizado para a versão ${version(ctx) ?: "mais recente"}."
            YoutubeDL.UpdateStatus.ALREADY_UP_TO_DATE -> "O motor já está na versão mais recente."
            null -> "Não foi possível verificar a atualização."
        }
    }

    fun version(ctx: Context): String? = runCatching { YoutubeDL.versionName(ctx.applicationContext) }.getOrNull()

    /** Traduz erros do yt-dlp para mensagens claras em português. */
    fun friendlyError(t: Throwable): String {
        val raw = (t.message ?: t.javaClass.simpleName).trim()
        val msg = raw.lines().lastOrNull { it.contains("ERROR", ignoreCase = true) } ?: raw.lines().lastOrNull().orEmpty()
        return when {
            t is YoutubeDL.CanceledException -> "Download cancelado."
            msg.contains("Unsupported URL", true) || msg.contains("is not a valid URL", true) ->
                "Link inválido ou não suportado. Cole um link do YouTube ou do Instagram."
            msg.contains("Unable to download", true) || msg.contains("resolve", true) || msg.contains("timed out", true) ||
                msg.contains("Network is unreachable", true) || msg.contains("Connection", true) || msg.contains("SSL", true) ->
                "Sem conexão com a internet. Verifique sua rede e tente de novo."
            msg.contains("Private", true) -> "Este conteúdo é privado e não pode ser baixado."
            msg.contains("login", true) || msg.contains("Sign in", true) || msg.contains("empty media response", true) ||
                msg.contains("rate-limit", true) || msg.contains("cookies", true) ->
                "O Instagram/YouTube pediu login ou limitou o acesso. Este conteúdo pode ser privado; tente mais tarde."
            msg.contains("unavailable", true) || msg.contains("removed", true) || msg.contains("not available", true) ->
                "Este vídeo está indisponível."
            msg.contains("age", true) && msg.contains("restrict", true) -> "Vídeo com restrição de idade."
            msg.contains("HTTP Error 403", true) || msg.contains("403", true) ->
                "O acesso foi negado (403). Tente atualizar o motor em Configurações."
            msg.contains("No space", true) -> "Sem espaço no aparelho."
            else -> "Falha no download: ${msg.removePrefix("ERROR:").trim().take(160).ifBlank { "erro desconhecido" }}"
        }
    }
}
