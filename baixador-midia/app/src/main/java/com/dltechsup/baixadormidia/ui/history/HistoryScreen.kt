package com.dltechsup.baixadormidia.ui.history

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.dltechsup.baixadormidia.R
import com.dltechsup.baixadormidia.data.HistoryItem
import com.dltechsup.baixadormidia.data.HistoryRepository
import com.dltechsup.baixadormidia.data.MediaSaver
import com.dltechsup.baixadormidia.data.Mode
import com.dltechsup.baixadormidia.ui.formatDate
import com.dltechsup.baixadormidia.ui.formatSize

private fun open(ctx: Context, item: HistoryItem, onMessage: (String) -> Unit) {
    val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(Uri.parse(item.uri), item.mime)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
        ctx.startActivity(intent)
    } catch (e: ActivityNotFoundException) {
        onMessage("Nenhum app encontrado para abrir este arquivo.")
    } catch (e: SecurityException) {
        onMessage("O arquivo não está mais disponível.")
    }
}

private fun share(ctx: Context, item: HistoryItem, onMessage: (String) -> Unit) {
    val send = Intent(Intent.ACTION_SEND)
        .setType(item.mime)
        .putExtra(Intent.EXTRA_STREAM, Uri.parse(item.uri))
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    try {
        ctx.startActivity(Intent.createChooser(send, "Compartilhar").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: Exception) {
        onMessage("Não foi possível compartilhar este arquivo.")
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(onMessage: (String) -> Unit) {
    val ctx = LocalContext.current
    val items by HistoryRepository.items.collectAsStateWithLifecycle()
    var toDelete by remember { mutableStateOf<HistoryItem?>(null) }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Text("Histórico", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))

        if (items.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(painterResource(R.drawable.ic_history), null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Nada baixado ainda.", modifier = Modifier.padding(top = 8.dp))
                    Text(
                        "Os arquivos que você baixar aparecem aqui.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(items, key = { it.id }) { item ->
                    Card(
                        onClick = { open(ctx, item, onMessage) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(
                                model = item.thumbnail,
                                contentDescription = null,
                                modifier = Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)),
                                contentScale = ContentScale.Crop,
                            )
                            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                Text(item.title, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleSmall)
                                val kind = if (item.mode == Mode.AUDIO) "Áudio" else "Vídeo"
                                Text(
                                    listOf(kind, formatSize(item.sizeBytes), formatDate(item.dateMillis)).filter { it.isNotBlank() }.joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            IconButton(onClick = { share(ctx, item, onMessage) }) { Icon(Icons.Default.Share, "Compartilhar") }
                            IconButton(onClick = { toDelete = item }) { Icon(Icons.Default.Delete, "Apagar") }
                        }
                    }
                }
            }
        }
    }

    toDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { toDelete = null },
            title = { Text("Apagar arquivo?") },
            text = { Text("“${item.title}” será removido do aparelho e do histórico.") },
            confirmButton = {
                TextButton(onClick = {
                    MediaSaver.delete(ctx, item)
                    HistoryRepository.remove(ctx, item.id)
                    toDelete = null
                    onMessage("Arquivo apagado.")
                }) { Text("Apagar") }
            },
            dismissButton = { TextButton(onClick = { toDelete = null }) { Text("Cancelar") } },
        )
    }
}
