package com.dltechsup.baixadormidia.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dltechsup.baixadormidia.data.AudioFormat
import com.dltechsup.baixadormidia.data.Mode
import com.dltechsup.baixadormidia.data.Settings
import com.dltechsup.baixadormidia.data.SettingsRepository
import com.dltechsup.baixadormidia.data.ThemeMode
import com.dltechsup.baixadormidia.engine.Engine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class EngineUi(val updating: Boolean = false, val message: String? = null, val version: String? = null)

class SettingsViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = SettingsRepository(app)
    val settings: StateFlow<Settings> = repo.settings.stateIn(viewModelScope, SharingStarted.Eagerly, Settings())

    private val _engine = MutableStateFlow(EngineUi(version = Engine.version(app)))
    val engine: StateFlow<EngineUi> = _engine

    fun setMode(v: Mode) = viewModelScope.launch { repo.setMode(v) }
    fun setAudioFormat(v: AudioFormat) = viewModelScope.launch { repo.setAudioFormat(v) }
    fun setVideoHeight(v: Int) = viewModelScope.launch { repo.setVideoHeight(v) }
    fun setTheme(v: ThemeMode) = viewModelScope.launch { repo.setTheme(v) }
    fun setFolder(v: String) = viewModelScope.launch { repo.setFolder(v) }

    fun updateEngine() {
        if (_engine.value.updating) return
        viewModelScope.launch {
            _engine.update { it.copy(updating = true, message = null) }
            val message = try {
                Engine.update(getApplication<Application>())
            } catch (t: Throwable) {
                Engine.friendlyError(t).let { if (it.startsWith("Falha")) "Não foi possível atualizar: ${it.removePrefix("Falha no download: ")}" else it }
            }
            _engine.update { EngineUi(updating = false, message = message, version = Engine.version(getApplication<Application>())) }
        }
    }
}
