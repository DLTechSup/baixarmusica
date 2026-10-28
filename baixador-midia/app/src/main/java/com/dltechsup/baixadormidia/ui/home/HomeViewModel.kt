package com.dltechsup.baixadormidia.ui.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dltechsup.baixadormidia.data.AudioFormat
import com.dltechsup.baixadormidia.data.DownloadSpec
import com.dltechsup.baixadormidia.data.LinkInbox
import com.dltechsup.baixadormidia.data.MediaInfo
import com.dltechsup.baixadormidia.data.Mode
import com.dltechsup.baixadormidia.data.SettingsRepository
import com.dltechsup.baixadormidia.engine.DownloadQueue
import com.dltechsup.baixadormidia.engine.Engine
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUi(
    val url: String = "",
    val loading: Boolean = false,
    val info: MediaInfo? = null,
    val error: String? = null,
    val mode: Mode = Mode.AUDIO,
    val audioFormat: AudioFormat = AudioFormat.MP3,
    val videoHeight: Int = 720,
)

class HomeViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = SettingsRepository(app)
    private val _ui = MutableStateFlow(HomeUi())
    val ui: StateFlow<HomeUi> = _ui.asStateFlow()

    private val _messages = Channel<String>(Channel.BUFFERED)
    val messages = _messages.receiveAsFlow()

    private var fetchJob: Job? = null

    init {
        // Formato inicial = padrão das Configurações
        viewModelScope.launch {
            val s = repo.settings.first()
            _ui.update { it.copy(mode = s.mode, audioFormat = s.audioFormat, videoHeight = s.videoHeight) }
        }
        // Link recebido pelo menu "Compartilhar"
        viewModelScope.launch {
            LinkInbox.pending.collect { link ->
                if (link != null) {
                    LinkInbox.consume()
                    onUrlChange(link)
                    fetch()
                }
            }
        }
    }

    fun onUrlChange(value: String) = _ui.update { it.copy(url = value, error = null) }

    fun onPaste(text: String?) {
        val link = LinkInbox.extractUrl(text) ?: text?.trim().orEmpty()
        if (link.isBlank()) {
            _ui.update { it.copy(error = "A área de transferência está vazia.") }
            return
        }
        onUrlChange(link)
        fetch()
    }

    fun clear() {
        fetchJob?.cancel()
        _ui.update { it.copy(url = "", info = null, error = null, loading = false) }
    }

    fun setMode(v: Mode) = _ui.update { it.copy(mode = v) }
    fun setAudioFormat(v: AudioFormat) = _ui.update { it.copy(audioFormat = v) }
    fun setVideoHeight(v: Int) = _ui.update { it.copy(videoHeight = v) }

    fun fetch() {
        val link = LinkInbox.extractUrl(_ui.value.url) ?: _ui.value.url.trim()
        if (!link.startsWith("http://") && !link.startsWith("https://")) {
            _ui.update { it.copy(error = "Link inválido. Cole um link do YouTube ou do Instagram.", info = null) }
            return
        }
        fetchJob?.cancel()
        fetchJob = viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null, info = null, url = link) }
            try {
                val info = Engine.fetchInfo(getApplication<Application>(), link)
                _ui.update { it.copy(loading = false, info = info) }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (t: Throwable) {
                _ui.update { it.copy(loading = false, error = Engine.friendlyError(t)) }
            }
        }
    }

    fun download() {
        val s = _ui.value
        val info = s.info ?: return
        viewModelScope.launch {
            val folder = repo.settings.first().folderName
            DownloadQueue.enqueue(
                getApplication<Application>(),
                DownloadSpec(
                    url = info.url,
                    title = info.title,
                    author = info.author,
                    thumbnail = info.thumbnail,
                    durationSec = info.durationSec,
                    mode = s.mode,
                    audioFormat = s.audioFormat,
                    videoHeight = s.videoHeight,
                    folderName = folder,
                ),
            )
            _messages.send("Adicionado aos downloads.")
            _ui.update { it.copy(url = "", info = null, error = null) }
        }
    }
}
