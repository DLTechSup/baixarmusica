package com.dltechsup.baixadormidia.ui.downloads

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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import com.dltechsup.baixadormidia.data.JobStatus
import com.dltechsup.baixadormidia.data.JobUi
import com.dltechsup.baixadormidia.data.Mode
import com.dltechsup.baixadormidia.data.isActive
import com.dltechsup.baixadormidia.data.isFinished
import com.dltechsup.baixadormidia.engine.DownloadQueue
import com.dltechsup.baixadormidia.ui.formatEta

private fun JobUi.statusText(): String = when (status) {
    JobStatus.QUEUED -> "Na fila"
    JobStatus.DOWNLOADING -> listOf("Baixando ${percent.toInt()}%", speed, formatEta(etaSec).let { if (it.isNotEmpty()) "$it restantes" else "" })
        .filter { it.isNotBlank() }.joinToString(" · ")
    JobStatus.PROCESSING -> if (spec.mode == Mode.AUDIO) "Convertendo…" else "Juntando vídeo e áudio…"
    JobStatus.SAVING -> "Salvando na pasta Download…"
    JobStatus.DONE -> "Concluído · veja em Histórico"
    JobStatus.ERROR -> error ?: "Falha no download."
    JobStatus.CANCELLED -> "Cancelado"
}

@Composable
fun DownloadsScreen() {
    val ctx = LocalContext.current
    val jobs by DownloadQueue.jobs.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Row(Modifier.fillMaxWidth().padding(top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Downloads", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            if (jobs.any { it.status.isFinished }) {
                TextButton(onClick = { DownloadQueue.clearFinished() }) { Text("Limpar finalizados") }
            }
        }

        if (jobs.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(painterResource(R.drawable.ic_download), null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Nenhum download em andamento.", modifier = Modifier.padding(top = 8.dp))
                    Text(
                        "Cole um link na tela Início para começar.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(jobs, key = { it.id }) { job ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(
                                model = job.spec.thumbnail,
                                contentDescription = null,
                                modifier = Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)),
                                contentScale = ContentScale.Crop,
                            )
                            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                Text(job.spec.title, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    job.statusText(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (job.status == JobStatus.ERROR) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                if (job.status.isActive) {
                                    val indeterminate = job.status != JobStatus.DOWNLOADING || job.percent <= 0f
                                    if (indeterminate) {
                                        LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 6.dp))
                                    } else {
                                        LinearProgressIndicator(progress = { job.percent / 100f }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                                    }
                                }
                            }
                            if (job.status.isActive) {
                                IconButton(onClick = { DownloadQueue.cancel(ctx, job.id) }) { Icon(Icons.Default.Close, "Cancelar") }
                            } else {
                                if (job.status == JobStatus.ERROR || job.status == JobStatus.CANCELLED) {
                                    IconButton(onClick = { DownloadQueue.retry(ctx, job.id) }) { Icon(Icons.Default.Refresh, "Tentar de novo") }
                                }
                                IconButton(onClick = { DownloadQueue.remove(job.id) }) { Icon(Icons.Default.Delete, "Remover da lista") }
                            }
                        }
                    }
                }
            }
        }
    }
}
