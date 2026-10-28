package com.dltechsup.baixadormidia.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Recebe links vindos do menu "Compartilhar" (ou de qualquer lugar) e entrega para a tela Início. */
object LinkInbox {
    private val _pending = MutableStateFlow<String?>(null)
    val pending: StateFlow<String?> = _pending

    private val urlRegex = Regex("""https?://[^\s<>"']+""")

    fun extractUrl(text: String?): String? = text?.let { urlRegex.find(it)?.value?.trimEnd('.', ',', ')', ']') }

    fun offer(text: String?) {
        extractUrl(text)?.let { _pending.value = it }
    }

    fun consume() {
        _pending.value = null
    }
}
