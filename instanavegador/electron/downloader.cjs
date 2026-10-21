// Baixa os arquivos de mídia para o disco, com fila e progresso.
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { net } = require('electron');

const CONCURRENCY = 3;

const safe = (s) => String(s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').slice(0, 80);

function extensionFor(entry, contentType) {
  const type = String(contentType || '').split(';')[0].trim().toLowerCase();
  const byType = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'video/mp4': '.mp4', 'video/quicktime': '.mov' };
  if (byType[type]) return byType[type];
  try {
    const ext = path.extname(new URL(entry.url).pathname).toLowerCase();
    if (/^\.(jpe?g|png|webp|mp4|mov|heic)$/.test(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  } catch {
    /* url inválida */
  }
  return entry.kind === 'video' ? '.mp4' : '.jpg';
}

function fileName(entry, ext) {
  const date = entry.taken ? new Date(entry.taken * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const owner = safe(entry.owner) || 'instagram';
  const suffix = entry.count > 1 ? `_${entry.index}` : '';
  const code = safe(entry.code) || safe(entry.id);
  return { folder: owner, name: `${owner}_${date}_${code}${suffix}${ext}` };
}

function createDownloader({ getOutDir, onState }) {
  const queue = [];
  const active = new Map(); // id -> AbortController
  const state = (id, patch) => onState({ id, ...patch });

  async function run(entry) {
    const controller = new AbortController();
    active.set(entry.id, controller);
    state(entry.id, { status: 'downloading', percent: 0 });
    try {
      const res = await net.fetch(entry.url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok || !res.body) throw new Error(`O Instagram respondeu ${res.status}. O link da mídia pode ter expirado: recarregue a página.`);
      const { folder, name } = fileName(entry, extensionFor(entry, res.headers.get('content-type')));
      const dir = path.join(getOutDir(), folder);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, name);
      const total = Number(res.headers.get('content-length')) || 0;
      let done = 0;
      let last = 0;
      const source = Readable.fromWeb(res.body);
      source.on('data', (chunk) => {
        done += chunk.length;
        const now = Date.now();
        if (total && now - last > 200) {
          last = now;
          state(entry.id, { status: 'downloading', percent: Math.min(99, (done / total) * 100) });
        }
      });
      await pipeline(source, fs.createWriteStream(file));
      state(entry.id, { status: 'done', percent: 100, file });
    } catch (err) {
      if (controller.signal.aborted) state(entry.id, { status: 'cancelled' });
      else state(entry.id, { status: 'error', error: err.message });
    } finally {
      active.delete(entry.id);
      pump();
    }
  }

  function pump() {
    while (active.size < CONCURRENCY && queue.length) run(queue.shift());
  }

  return {
    enqueue(entries) {
      for (const entry of entries) {
        if (active.has(entry.id) || queue.some((q) => q.id === entry.id)) continue;
        state(entry.id, { status: 'queued', percent: 0 });
        queue.push(entry);
      }
      pump();
    },
    cancel(id) {
      const i = queue.findIndex((q) => q.id === id);
      if (i >= 0) {
        queue.splice(i, 1);
        state(id, { status: 'cancelled' });
      }
      active.get(id)?.abort();
    },
  };
}

module.exports = { createDownloader, fileName, extensionFor };
