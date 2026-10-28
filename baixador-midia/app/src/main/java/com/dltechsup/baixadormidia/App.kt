package com.dltechsup.baixadormidia

import android.app.Application
import com.dltechsup.baixadormidia.data.HistoryRepository
import com.dltechsup.baixadormidia.engine.Engine
import com.dltechsup.baixadormidia.engine.Notifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class App : Application() {
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        instance = this
        Notifications.createChannels(this)
        HistoryRepository.load(this)
        // Prepara o motor (yt-dlp + Python + FFmpeg) em segundo plano. A primeira vez extrai os arquivos e leva alguns segundos.
        appScope.launch(Dispatchers.IO) { Engine.ensure(this@App) }
    }

    companion object {
        lateinit var instance: App
            private set
    }
}
