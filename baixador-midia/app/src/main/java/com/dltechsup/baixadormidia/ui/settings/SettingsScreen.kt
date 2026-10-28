package com.dltechsup.baixadormidia.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dltechsup.baixadormidia.data.AudioFormat
import com.dltechsup.baixadormidia.data.Mode
import com.dltechsup.baixadormidia.data.SettingsRepository
import com.dltechsup.baixadormidia.data.ThemeMode

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
        content()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(vm: SettingsViewModel = viewModel()) {
    val s by vm.settings.collectAsStateWithLifecycle()
    val engine by vm.engine.collectAsStateWithLifecycle()
    var folder by remember { mutableStateOf(s.folderName) }
    // Só sobrescreve o campo quando o valor salvo realmente difere do que foi digitado (evita brigar com espaços no fim).
    LaunchedEffect(s.folderName) {
        if (SettingsRepository.sanitizeFolder(folder) != s.folderName) folder = s.folderName
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Text("Configurações", style = MaterialTheme.typography.headlineSmall)

        Section("Formato padrão") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(s.mode == Mode.AUDIO, { vm.setMode(Mode.AUDIO) }, label = { Text("Áudio") })
                FilterChip(s.mode == Mode.VIDEO, { vm.setMode(Mode.VIDEO) }, label = { Text("Vídeo (MP4)") })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AudioFormat.entries.forEach { f ->
                    FilterChip(s.audioFormat == f, { vm.setAudioFormat(f) }, label = { Text(f.label) })
                }
            }
        }

        Section("Qualidade padrão do vídeo") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(360 to "360p", 720 to "720p", 1080 to "1080p", 0 to "Melhor").forEach { (h, label) ->
                    FilterChip(s.videoHeight == h, { vm.setVideoHeight(h) }, label = { Text(label) })
                }
            }
        }

        Section("Pasta de destino") {
            OutlinedTextField(
                value = folder,
                onValueChange = { folder = it; vm.setFolder(it) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Nome da pasta") },
                supportingText = {
                    Text("Salvo em Download/${s.folderName}/Musicas e Download/${s.folderName}/Videos")
                },
            )
        }

        Section("Tema") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ThemeMode.entries.forEach { t -> FilterChip(s.theme == t, { vm.setTheme(t) }, label = { Text(t.label) }) }
            }
        }

        HorizontalDivider()

        Section("Motor de download (yt-dlp)") {
            Text(
                "Versão: ${engine.version ?: "—"}",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                "YouTube e Instagram mudam com frequência. Se algum download parar de funcionar, atualize o motor.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = vm::updateEngine, enabled = !engine.updating) { Text("Atualizar motor") }
                if (engine.updating) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            }
            engine.message?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        }

        HorizontalDivider()

        Section("Sobre") {
            Text("Baixador de Mídia · Desenvolvido por DLTechSup", style = MaterialTheme.typography.bodyMedium)
            Text(
                "Use apenas com conteúdo seu ou que você tenha direito de baixar, respeitando os termos de uso do YouTube e do Instagram.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
