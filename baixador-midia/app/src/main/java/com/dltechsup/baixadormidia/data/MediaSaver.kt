package com.dltechsup.baixadormidia.data

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File

/** Copia o arquivo pronto (da pasta temporária) para Download/<pasta>/Musicas ou Videos. */
object MediaSaver {
    data class Saved(val uri: Uri, val path: String?, val displayName: String, val mime: String, val size: Long)

    fun subFolder(mode: Mode) = if (mode == Mode.AUDIO) "Musicas" else "Videos"

    fun mimeFor(file: File): String = when (file.extension.lowercase()) {
        "mp3" -> "audio/mpeg"
        "m4a" -> "audio/mp4"
        "aac" -> "audio/aac"
        "opus", "ogg" -> "audio/ogg"
        "mp4" -> "video/mp4"
        "mkv" -> "video/x-matroska"
        "webm" -> "video/webm"
        else -> "application/octet-stream"
    }

    fun save(ctx: Context, file: File, mode: Mode, folderName: String): Saved {
        val mime = mimeFor(file)
        val relative = "${Environment.DIRECTORY_DOWNLOADS}/$folderName/${subFolder(mode)}"
        val size = file.length()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val resolver = ctx.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, file.name)
                put(MediaStore.MediaColumns.MIME_TYPE, mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, relative)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("Não foi possível criar o arquivo na pasta Download.")
            try {
                resolver.openOutputStream(uri)?.use { out -> file.inputStream().use { it.copyTo(out) } }
                    ?: error("Não foi possível gravar o arquivo.")
                resolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
            } catch (t: Throwable) {
                resolver.delete(uri, null, null)
                throw t
            }
            return Saved(uri, null, file.name, mime, size)
        }

        // Android 9 e anterior: grava direto em Download/ (precisa da permissão WRITE_EXTERNAL_STORAGE)
        @Suppress("DEPRECATION")
        val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "$folderName/${subFolder(mode)}")
        if (!dir.exists() && !dir.mkdirs()) error("Não foi possível criar a pasta ${dir.path}. Conceda a permissão de armazenamento.")
        var dest = File(dir, file.name)
        var n = 1
        while (dest.exists()) dest = File(dir, "${file.nameWithoutExtension} ($n).${file.extension}").also { n++ }
        file.copyTo(dest)
        MediaScannerConnection.scanFile(ctx, arrayOf(dest.absolutePath), arrayOf(mime), null)
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", dest)
        return Saved(uri, dest.absolutePath, dest.name, mime, size)
    }

    /** Apaga o arquivo baixado. Retorna true se foi removido (ou já não existia). */
    fun delete(ctx: Context, item: HistoryItem): Boolean = runCatching {
        if (item.path != null) {
            val f = File(item.path)
            val ok = !f.exists() || f.delete()
            MediaScannerConnection.scanFile(ctx, arrayOf(item.path), null, null)
            ok
        } else {
            ctx.contentResolver.delete(Uri.parse(item.uri), null, null)
            true
        }
    }.getOrDefault(false)
}
