package com.dltechsup.baixadormidia.engine

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.dltechsup.baixadormidia.MainActivity
import com.dltechsup.baixadormidia.R
import java.util.UUID

object Notifications {
    const val CHANNEL_PROGRESS = "downloads"
    const val CHANNEL_DONE = "done"

    fun createChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_PROGRESS, ctx.getString(R.string.channel_downloads), NotificationManager.IMPORTANCE_LOW),
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_DONE, ctx.getString(R.string.channel_done), NotificationManager.IMPORTANCE_DEFAULT),
        )
    }

    fun notificationId(jobId: String): Int = jobId.hashCode() and 0x7fffffff

    private fun openApp(ctx: Context): PendingIntent =
        PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    fun progress(ctx: Context, workId: UUID, title: String, percent: Float, text: String): android.app.Notification {
        val cancel = androidx.work.WorkManager.getInstance(ctx).createCancelPendingIntent(workId)
        val b = NotificationCompat.Builder(ctx, CHANNEL_PROGRESS)
            .setSmallIcon(R.drawable.ic_stat_download)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp(ctx))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .addAction(0, "Cancelar", cancel)
        if (percent in 0f..100f && text.startsWith("Baixando")) b.setProgress(100, percent.toInt(), false)
        else b.setProgress(0, 0, true)
        return b.build()
    }

    fun finished(ctx: Context, jobId: String, title: String, text: String) {
        val n = NotificationCompat.Builder(ctx, CHANNEL_DONE)
            .setSmallIcon(R.drawable.ic_stat_download)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp(ctx))
            .setAutoCancel(true)
            .build()
        runCatching { ctx.getSystemService(NotificationManager::class.java).notify(notificationId(jobId) + 1, n) }
    }

    fun cancel(ctx: Context, jobId: String) {
        ctx.getSystemService(NotificationManager::class.java).cancel(notificationId(jobId))
    }
}
