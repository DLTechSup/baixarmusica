package com.dltechsup.baixadormidia.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class ThemeMode(val label: String) { SYSTEM("Sistema"), LIGHT("Claro"), DARK("Escuro") }

data class Settings(
    val mode: Mode = Mode.AUDIO,
    val audioFormat: AudioFormat = AudioFormat.MP3,
    /** 0 = melhor disponível. */
    val videoHeight: Int = 720,
    val theme: ThemeMode = ThemeMode.SYSTEM,
    /** Subpasta dentro de Download/. */
    val folderName: String = DEFAULT_FOLDER,
) {
    companion object {
        const val DEFAULT_FOLDER = "BaixadorMidia"
    }
}

private val Context.store: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsRepository(private val context: Context) {
    private val kMode = stringPreferencesKey("mode")
    private val kAudio = stringPreferencesKey("audio_format")
    private val kHeight = intPreferencesKey("video_height")
    private val kTheme = stringPreferencesKey("theme")
    private val kFolder = stringPreferencesKey("folder")

    val settings: Flow<Settings> = context.store.data.map { p ->
        Settings(
            mode = p[kMode]?.let { runCatching { Mode.valueOf(it) }.getOrNull() } ?: Mode.AUDIO,
            audioFormat = p[kAudio]?.let { runCatching { AudioFormat.valueOf(it) }.getOrNull() } ?: AudioFormat.MP3,
            videoHeight = p[kHeight] ?: 720,
            theme = p[kTheme]?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() } ?: ThemeMode.SYSTEM,
            folderName = p[kFolder]?.ifBlank { null } ?: Settings.DEFAULT_FOLDER,
        )
    }

    suspend fun setMode(v: Mode) = context.store.edit { it[kMode] = v.name }
    suspend fun setAudioFormat(v: AudioFormat) = context.store.edit { it[kAudio] = v.name }
    suspend fun setVideoHeight(v: Int) = context.store.edit { it[kHeight] = v }
    suspend fun setTheme(v: ThemeMode) = context.store.edit { it[kTheme] = v.name }
    suspend fun setFolder(v: String) = context.store.edit { it[kFolder] = sanitizeFolder(v) }

    companion object {
        /** Nome de pasta seguro: sem barras nem caracteres proibidos. */
        fun sanitizeFolder(raw: String): String =
            raw.replace(Regex("""[\\/:*?"<>|]"""), "").trim().trim('.').ifBlank { Settings.DEFAULT_FOLDER }.take(40)
    }
}
