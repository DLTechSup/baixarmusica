package com.dltechsup.baixadormidia.ui

import java.text.DateFormat
import java.util.Date

fun formatDuration(sec: Int): String {
    if (sec <= 0) return ""
    val h = sec / 3600
    val m = sec % 3600 / 60
    val s = sec % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

fun formatEta(sec: Long): String = when {
    sec < 0 -> ""
    sec < 60 -> "${sec}s"
    else -> formatDuration(sec.toInt())
}

fun formatSize(bytes: Long): String {
    if (bytes <= 0) return ""
    val units = arrayOf("B", "KB", "MB", "GB")
    var v = bytes.toDouble()
    var i = 0
    while (v >= 1024 && i < units.lastIndex) { v /= 1024; i++ }
    return if (i == 0) "${v.toInt()} ${units[i]}" else "%.1f %s".format(v, units[i])
}

fun formatDate(millis: Long): String = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(millis))
