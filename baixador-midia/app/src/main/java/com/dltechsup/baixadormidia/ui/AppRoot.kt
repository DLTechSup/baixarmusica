package com.dltechsup.baixadormidia.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.res.painterResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.dltechsup.baixadormidia.R
import com.dltechsup.baixadormidia.data.LinkInbox
import com.dltechsup.baixadormidia.data.Settings
import com.dltechsup.baixadormidia.data.SettingsRepository
import com.dltechsup.baixadormidia.data.isActive
import com.dltechsup.baixadormidia.engine.DownloadQueue
import com.dltechsup.baixadormidia.ui.downloads.DownloadsScreen
import com.dltechsup.baixadormidia.ui.history.HistoryScreen
import com.dltechsup.baixadormidia.ui.home.HomeScreen
import com.dltechsup.baixadormidia.ui.settings.SettingsScreen
import com.dltechsup.baixadormidia.ui.theme.AppTheme
import kotlinx.coroutines.launch

private enum class Tab(val route: String, val label: String) {
    HOME("home", "Início"),
    DOWNLOADS("downloads", "Downloads"),
    HISTORY("history", "Histórico"),
    SETTINGS("settings", "Config."),
}

@Composable
fun AppRoot() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val repo = remember { SettingsRepository(context.applicationContext) }
    val settings by repo.settings.collectAsStateWithLifecycle(initialValue = Settings())

    AppTheme(settings.theme) {
        Surface {
            val nav = rememberNavController()
            val backStack by nav.currentBackStackEntryAsState()
            val snackbar = remember { SnackbarHostState() }
            val scope = rememberCoroutineScope()
            val jobs by DownloadQueue.jobs.collectAsStateWithLifecycle()
            val activeCount = jobs.count { it.status.isActive }
            val pendingLink by LinkInbox.pending.collectAsStateWithLifecycle()

            val show: (String) -> Unit = { msg -> scope.launch { snackbar.showSnackbar(msg) } }

            fun go(route: String) = nav.navigate(route) {
                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }

            // Link vindo do menu "Compartilhar": volta para a tela Início
            LaunchedEffect(pendingLink) { if (pendingLink != null) go(Tab.HOME.route) }

            Scaffold(
                snackbarHost = { SnackbarHost(snackbar) },
                bottomBar = {
                    NavigationBar {
                        Tab.entries.forEach { tab ->
                            val selected = backStack?.destination?.route == tab.route
                            NavigationBarItem(
                                selected = selected,
                                onClick = { go(tab.route) },
                                icon = {
                                    val icon: Painter = when (tab) {
                                        Tab.HOME -> painterResource(R.drawable.ic_music)
                                        Tab.DOWNLOADS -> painterResource(R.drawable.ic_download)
                                        Tab.HISTORY -> painterResource(R.drawable.ic_history)
                                        Tab.SETTINGS -> rememberVectorPainter(Icons.Default.Settings)
                                    }
                                    if (tab == Tab.DOWNLOADS && activeCount > 0) {
                                        BadgedBox(badge = { Badge { Text("$activeCount") } }) { Icon(icon, tab.label) }
                                    } else {
                                        Icon(icon, tab.label)
                                    }
                                },
                                label = { Text(tab.label) },
                            )
                        }
                    }
                },
            ) { padding ->
                NavHost(nav, startDestination = Tab.HOME.route, modifier = Modifier.padding(padding)) {
                    composable(Tab.HOME.route) { HomeScreen(onMessage = show) }
                    composable(Tab.DOWNLOADS.route) { DownloadsScreen() }
                    composable(Tab.HISTORY.route) { HistoryScreen(onMessage = show) }
                    composable(Tab.SETTINGS.route) { SettingsScreen() }
                }
            }
        }
    }
}
