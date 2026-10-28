package com.dltechsup.baixadormidia.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.dltechsup.baixadormidia.R
import com.dltechsup.baixadormidia.data.AudioFormat
import com.dltechsup.baixadormidia.data.Mode
import com.dltechsup.baixadormidia.engine.Engine
import com.dltechsup.baixadormidia.engine.EngineState
import com.dltechsup.baixadormidia.ui.formatDuration

private val HEIGHTS = listOf(360 to "360p", 720 to "720p", 1080 to "1080p", 0 to "Melhor")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onMessage: (String) -> Unit, vm: HomeViewModel = viewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val engine by Engine.state.collectAsState()
    val clipboard = LocalClipboardManager.current

    LaunchedEffect(Unit) { vm.messages.collect { onMessage(it) } }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Baixe músicas e vídeos", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Cole o link de um vídeo do YouTube ou do Instagram.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        when (val e = engine) {
            EngineState.Starting -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Text("Preparando o motor de download (só na primeira vez)…", style = MaterialTheme.typography.bodySmall)
            }
            is EngineState.Failed -> Text(
                "O motor não iniciou: ${e.message}",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
            EngineState.Ready -> Unit
        }

        OutlinedTextField(
            value = ui.url,
            onValueChange = vm::onUrlChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Link do vídeo") },
            placeholder = { Text("https://…") },
            isError = ui.error != null,
            trailingIcon = {
                if (ui.url.isNotEmpty()) {
                    IconButton(onClick = vm::clear) { Icon(Icons.Default.Close, contentDescription = "Limpar") }
                }
            },
        )

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(
                onClick = { vm.onPaste(clipboard.getText()?.text) },
                modifier = Modifier.weight(1f),
            ) {
                Icon(painterResource(R.drawable.ic_paste), null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Colar")
            }
            Button(onClick = vm::fetch, enabled = ui.url.isNotBlank() && !ui.loading, modifier = Modifier.weight(1f)) {
                Text(if (ui.loading) "Buscando…" else "Buscar")
            }
        }

        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }

        if (ui.loading) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator() }
        }

        ui.info?.let { info ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column {
                    AsyncImage(
                        model = info.thumbnail,
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(info.title, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                        val sub = listOf(info.author, formatDuration(info.durationSec)).filter { it.isNotBlank() }.joinToString(" · ")
                        if (sub.isNotEmpty()) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            Text("Formato", style = MaterialTheme.typography.titleSmall)
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = ui.mode == Mode.AUDIO,
                    onClick = { vm.setMode(Mode.AUDIO) },
                    shape = SegmentedButtonDefaults.itemShape(0, 2),
                ) { Text("Áudio") }
                SegmentedButton(
                    selected = ui.mode == Mode.VIDEO,
                    onClick = { vm.setMode(Mode.VIDEO) },
                    shape = SegmentedButtonDefaults.itemShape(1, 2),
                ) { Text("Vídeo (MP4)") }
            }

            if (ui.mode == Mode.AUDIO) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AudioFormat.entries.forEach { f ->
                        FilterChip(
                            selected = ui.audioFormat == f,
                            onClick = { vm.setAudioFormat(f) },
                            label = { Text(if (f == AudioFormat.MP3) "MP3 · 320 kbps" else "M4A") },
                        )
                    }
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    HEIGHTS.forEach { (h, label) ->
                        FilterChip(selected = ui.videoHeight == h, onClick = { vm.setVideoHeight(h) }, label = { Text(label) })
                    }
                }
            }

            Button(onClick = vm::download, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Icon(painterResource(R.drawable.ic_download), null, Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(if (ui.mode == Mode.AUDIO) "Baixar áudio" else "Baixar vídeo")
            }
        }

        Spacer(Modifier.height(8.dp))
        Text(
            "Use apenas com conteúdo seu ou que você tenha direito de baixar, respeitando os termos de uso das plataformas.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
