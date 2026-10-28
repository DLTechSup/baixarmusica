package com.dltechsup.baixadormidia.data

import androidx.work.Data
import androidx.work.workDataOf

enum class Mode { AUDIO, VIDEO }

enum class AudioFormat(val ext: String, val label: String) {
    MP3("mp3", "MP3"),
    M4A("m4a", "M4A"),
}

/** Prévia do que será baixado. */
data class MediaInfo(
    val url: String,
    val title: String,
    val author: String,
    val durationSec: Int,
    val thumbnail: String?,
)

/** Tudo que o motor precisa para baixar um item. */
data class DownloadSpec(
    val url: String,
    val title: String,
    val author: String,
    val thumbnail: String?,
    val durationSec: Int,
    val mode: Mode,
    val audioFormat: AudioFormat,
    /** Altura máxima do vídeo em pixels; 0 = melhor disponível. */
    val videoHeight: Int,
    val folderName: String,
) {
    fun toData(id: String): Data = workDataOf(
        K_ID to id,
        K_URL to url,
        K_TITLE to title,
        K_AUTHOR to author,
        K_THUMB to (thumbnail ?: ""),
        K_DURATION to durationSec,
        K_MODE to mode.name,
        K_AUDIO to audioFormat.name,
        K_HEIGHT to videoHeight,
        K_FOLDER to folderName,
    )

    companion object {
        const val K_ID = "id"
        const val K_URL = "url"
        const val K_TITLE = "title"
        const val K_AUTHOR = "author"
        const val K_THUMB = "thumb"
        const val K_DURATION = "duration"
        const val K_MODE = "mode"
        const val K_AUDIO = "audio"
        const val K_HEIGHT = "height"
        const val K_FOLDER = "folder"

        fun fromData(d: Data) = DownloadSpec(
            url = d.getString(K_URL).orEmpty(),
            title = d.getString(K_TITLE).orEmpty(),
            author = d.getString(K_AUTHOR).orEmpty(),
            thumbnail = d.getString(K_THUMB)?.ifBlank { null },
            durationSec = d.getInt(K_DURATION, 0),
            mode = runCatching { Mode.valueOf(d.getString(K_MODE).orEmpty()) }.getOrDefault(Mode.AUDIO),
            audioFormat = runCatching { AudioFormat.valueOf(d.getString(K_AUDIO).orEmpty()) }.getOrDefault(AudioFormat.MP3),
            videoHeight = d.getInt(K_HEIGHT, 0),
            folderName = d.getString(K_FOLDER).orEmpty().ifBlank { "BaixadorMidia" },
        )
    }
}

enum class JobStatus { QUEUED, DOWNLOADING, PROCESSING, SAVING, DONE, ERROR, CANCELLED }

val JobStatus.isActive get() = this == JobStatus.QUEUED || this == JobStatus.DOWNLOADING || this == JobStatus.PROCESSING || this == JobStatus.SAVING
val JobStatus.isFinished get() = !isActive

/** Estado de um download para a tela Downloads. */
data class JobUi(
    val id: String,
    val spec: DownloadSpec,
    val status: JobStatus = JobStatus.QUEUED,
    val percent: Float = 0f,
    val speed: String = "",
    val etaSec: Long = -1,
    val error: String? = null,
)

/** Arquivo já baixado, para a tela Histórico. */
data class HistoryItem(
    val id: String,
    val title: String,
    val author: String,
    val uri: String,
    /** Caminho real do arquivo; só existe no Android 9 e anterior. */
    val path: String?,
    val mime: String,
    val mode: Mode,
    val sizeBytes: Long,
    val dateMillis: Long,
    val sourceUrl: String,
    val thumbnail: String?,
)
