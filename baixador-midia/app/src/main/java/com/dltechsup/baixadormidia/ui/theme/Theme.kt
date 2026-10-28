package com.dltechsup.baixadormidia.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.dltechsup.baixadormidia.data.ThemeMode

val Pink = Color(0xFFFF5F8F)
val Violet = Color(0xFF8B5CF6)

private val Dark = darkColorScheme(
    primary = Color(0xFFFF7FA6),
    onPrimary = Color(0xFF3A0019),
    primaryContainer = Color(0xFF5C1F38),
    onPrimaryContainer = Color(0xFFFFD9E3),
    secondary = Color(0xFFB69CFF),
    onSecondary = Color(0xFF2A0F6B),
    secondaryContainer = Color(0xFF3F2A85),
    onSecondaryContainer = Color(0xFFE6DDFF),
    background = Color(0xFF0B0B12),
    onBackground = Color(0xFFF1F1F7),
    surface = Color(0xFF14141F),
    onSurface = Color(0xFFF1F1F7),
    surfaceVariant = Color(0xFF1F1F2E),
    onSurfaceVariant = Color(0xFFB4B4C6),
    outline = Color(0xFF454560),
    error = Color(0xFFF87171),
)

private val Light = lightColorScheme(
    primary = Color(0xFFD6336C),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFD9E3),
    onPrimaryContainer = Color(0xFF3A0019),
    secondary = Color(0xFF6D3FD8),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE9DDFF),
    onSecondaryContainer = Color(0xFF22005D),
    background = Color(0xFFFFFBFF),
    onBackground = Color(0xFF1C1B1F),
    surface = Color(0xFFFFFBFF),
    onSurface = Color(0xFF1C1B1F),
    surfaceVariant = Color(0xFFF3EAF0),
    onSurfaceVariant = Color(0xFF4F4A52),
    outline = Color(0xFF7F7882),
    error = Color(0xFFBA1A1A),
)

@Composable
fun AppTheme(theme: ThemeMode, content: @Composable () -> Unit) {
    val dark = when (theme) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
}
