package com.dltechsup.baixadormidia.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** Histórico guardado num arquivo JSON simples (history.json) na pasta interna do app. */
object HistoryRepository {
    private val _items = MutableStateFlow<List<HistoryItem>>(emptyList())
    val items: StateFlow<List<HistoryItem>> = _items

    private fun file(ctx: Context) = File(ctx.filesDir, "history.json")

    @Synchronized
    fun load(ctx: Context) {
        val f = file(ctx)
        if (!f.exists()) return
        _items.value = runCatching {
            val arr = JSONArray(f.readText())
            (0 until arr.length()).map { fromJson(arr.getJSONObject(it)) }
        }.getOrDefault(emptyList())
    }

    @Synchronized
    fun add(ctx: Context, item: HistoryItem) {
        _items.update { listOf(item) + it }
        save(ctx)
    }

    @Synchronized
    fun remove(ctx: Context, id: String) {
        _items.update { list -> list.filterNot { it.id == id } }
        save(ctx)
    }

    private fun save(ctx: Context) {
        val arr = JSONArray()
        _items.value.forEach { arr.put(toJson(it)) }
        runCatching { file(ctx).writeText(arr.toString()) }
    }

    private fun toJson(h: HistoryItem) = JSONObject().apply {
        put("id", h.id); put("title", h.title); put("author", h.author); put("uri", h.uri)
        put("path", h.path ?: JSONObject.NULL); put("mime", h.mime); put("mode", h.mode.name)
        put("size", h.sizeBytes); put("date", h.dateMillis); put("source", h.sourceUrl)
        put("thumb", h.thumbnail ?: JSONObject.NULL)
    }

    private fun fromJson(o: JSONObject) = HistoryItem(
        id = o.getString("id"),
        title = o.optString("title"),
        author = o.optString("author"),
        uri = o.getString("uri"),
        path = if (o.isNull("path")) null else o.getString("path"),
        mime = o.optString("mime", "*/*"),
        mode = runCatching { Mode.valueOf(o.optString("mode")) }.getOrDefault(Mode.AUDIO),
        sizeBytes = o.optLong("size"),
        dateMillis = o.optLong("date"),
        sourceUrl = o.optString("source"),
        thumbnail = if (o.isNull("thumb")) null else o.getString("thumb"),
    )
}
