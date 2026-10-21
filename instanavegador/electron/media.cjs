// Extrai fotos, vídeos e Reels das respostas JSON que o próprio Instagram carrega na página.
// Como a página já está logada e faz esses pedidos sozinha, não precisamos chamar nenhuma API por fora.

const MAX_DEPTH = 40;

const area = (c) => (c.width || 0) * (c.height || 0);
const largest = (list) => (list || []).filter((c) => c && c.url).sort((a, b) => area(b) - area(a))[0];

// Escolhe a miniatura mais próxima de ~360 px de largura para o painel.
function pickThumb(list) {
  const cands = (list || []).filter((c) => c && c.url);
  if (!cands.length) return null;
  return cands.sort((a, b) => Math.abs((a.width || 0) - 360) - Math.abs((b.width || 0) - 360))[0].url;
}

// Nome do arquivo (sem a query) — serve para casar uma <img> da página com o item do catálogo.
function fileKey(url) {
  try {
    return new URL(url).pathname.split('/').pop();
  } catch {
    return String(url).split('?')[0].split('/').pop();
  }
}

function nodeToEntry(node, parent, index, count) {
  const isVideo = node.media_type === 2 || Boolean(node.video_versions && node.video_versions.length);
  const image = largest(node.image_versions2 && node.image_versions2.candidates);
  const video = isVideo ? largest(node.video_versions) : null;
  const url = isVideo ? video && video.url : image && image.url;
  if (!url) return null;
  const owner = (parent.user && parent.user.username) || (parent.owner && parent.owner.username) || '';
  const keys = ((node.image_versions2 && node.image_versions2.candidates) || []).map((c) => fileKey(c.url));
  return {
    id: count > 1 ? `${parent.code}_${index + 1}` : parent.code,
    code: parent.code,
    index: index + 1,
    count,
    owner,
    kind: isVideo ? 'video' : 'photo',
    reel: parent.product_type === 'clips',
    thumb: pickThumb(node.image_versions2 && node.image_versions2.candidates) || (image && image.url),
    url,
    width: (video || image || {}).width || null,
    height: (video || image || {}).height || null,
    keys,
    caption: ((parent.caption && parent.caption.text) || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    taken: parent.taken_at || 0,
  };
}

function itemToEntries(item) {
  if (!item || !item.code) return [];
  const kids = Array.isArray(item.carousel_media) && item.carousel_media.length ? item.carousel_media : null;
  const nodes = kids || [item];
  const out = [];
  nodes.forEach((n, i) => {
    const e = nodeToEntry(n, item, i, nodes.length);
    if (e) out.push(e);
  });
  return out;
}

// Percorre qualquer JSON e coleta os objetos que parecem um post (têm "code" e versões de imagem/vídeo).
function extract(json) {
  const found = new Map();
  const walk = (value, depth) => {
    if (!value || typeof value !== 'object' || depth > MAX_DEPTH) return;
    if (Array.isArray(value)) {
      for (const v of value) walk(v, depth + 1);
      return;
    }
    if (typeof value.code === 'string' && (value.image_versions2 || value.video_versions || value.carousel_media)) {
      for (const e of itemToEntries(value)) found.set(e.id, e);
      return; // os filhos (carousel_media) já foram tratados
    }
    for (const key of Object.keys(value)) walk(value[key], depth + 1);
  };
  walk(json, 0);
  return [...found.values()];
}

// Respostas do Instagram às vezes vêm com um prefixo anti-XSSI ("for (;;);") ou em várias linhas.
function parseBody(text) {
  const clean = String(text).replace(/^for\s*\(;;\);/, '').trim();
  if (!clean) return [];
  try {
    return [JSON.parse(clean)];
  } catch {
    const docs = [];
    for (const line of clean.split(/\r?\n/)) {
      try {
        docs.push(JSON.parse(line));
      } catch {
        /* linha que não é JSON */
      }
    }
    return docs;
  }
}

// HTML da página: os primeiros dados vêm dentro de <script type="application/json">.
function extractFromHtml(html) {
  const found = new Map();
  const re = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    if (!/image_versions2|video_versions|carousel_media/.test(m[1])) continue;
    for (const doc of parseBody(m[1])) for (const e of extract(doc)) found.set(e.id, e);
  }
  return [...found.values()];
}

const extractFromBody = (text) => parseBody(text).flatMap(extract);

module.exports = { extract, extractFromBody, extractFromHtml, fileKey };
