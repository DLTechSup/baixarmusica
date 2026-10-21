// Roda dentro da página do Instagram: mostra um botão "Baixar" sobre a foto/vídeo sob o mouse
// e avisa o app sobre as imagens que aparecem na tela.
const { ipcRenderer } = require('electron');

const fileKey = (url) => {
  try {
    return new URL(url).pathname.split('/').pop();
  } catch {
    return String(url).split('?')[0].split('/').pop();
  }
};

// Maior candidato do srcset (o Instagram entrega várias larguras).
function bestFromSrcset(img) {
  const set = (img.srcset || '').split(',').map((s) => s.trim().split(/\s+/)).filter((p) => p[0]);
  const sized = set.map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 })).sort((a, b) => b.w - a.w);
  return sized[0]?.url || img.currentSrc || img.src;
}

function init() {
  const host = document.createElement('div');
  host.id = 'insta-nav-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      .btn { position: fixed; display: none; pointer-events: auto; align-items: center; gap: 6px; border: 0; cursor: pointer;
        padding: 8px 12px; border-radius: 999px; color: #fff; font: 600 13px system-ui, sans-serif;
        background: linear-gradient(135deg, #ff5f8f, #8b5cf6); box-shadow: 0 6px 20px rgba(0,0,0,.45); }
      .btn:hover { filter: brightness(1.1); }
      .toast { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); display: none; padding: 10px 16px;
        border-radius: 12px; background: #1c1c2b; color: #fff; font: 500 13px system-ui, sans-serif; border: 1px solid #38384f; }
    </style>
    <button class="btn" id="b">⬇ Baixar</button>
    <div class="toast" id="t"></div>`;
  const btn = root.getElementById('b');
  const toast = root.getElementById('t');
  document.documentElement.append(host);

  let target = null;
  let hideTimer;
  let toastTimer;

  const showToast = (text) => {
    toast.textContent = text;
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.style.display = 'none'), 3200);
  };
  ipcRenderer.on('overlay:toast', (_e, text) => showToast(text));

  const place = (el) => {
    const r = el.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 110, Math.max(8, r.right - 106));
    const top = Math.min(window.innerHeight - 44, Math.max(8, r.top + 10));
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    btn.style.display = 'inline-flex';
  };

  const isMedia = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    if (el.tagName === 'IMG') return r.width >= 150 && r.height >= 150 && !(el.alt || '').toLowerCase().includes('foto do perfil');
    if (el.tagName === 'VIDEO') return r.width >= 150 && r.height >= 150;
    return false;
  };

  let pending = false;
  let mx = 0;
  let my = 0;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const stack = document.elementsFromPoint(mx, my);
      if (stack.includes(host)) return; // mouse sobre o próprio botão: mantém o alvo
      const found = stack.find(isMedia);
      if (found) {
        clearTimeout(hideTimer);
        target = found;
        place(found);
      } else if (target) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          target = null;
          btn.style.display = 'none';
        }, 250);
      }
    });
  }, { passive: true });
  window.addEventListener('scroll', () => target && place(target), { passive: true, capture: true });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!target) return;
    if (target.tagName === 'VIDEO') {
      ipcRenderer.send('overlay:download', { kind: 'video', posterKey: target.poster ? fileKey(target.poster) : null, path: location.pathname });
    } else {
      const src = bestFromSrcset(target);
      ipcRenderer.send('overlay:download', {
        kind: 'image',
        src,
        keys: [fileKey(target.currentSrc || target.src), fileKey(src)].filter(Boolean),
        path: location.pathname,
      });
    }
  });

  // Fallback: avisa o app das imagens visíveis (caso a resposta da API não tenha sido capturada).
  let scanTimer;
  const scan = () => {
    const images = [];
    for (const img of document.images) {
      const r = img.getBoundingClientRect();
      if (r.width < 200 || r.height < 200 || !img.currentSrc) continue;
      if (/\/(s150x150|s240x240)\//.test(img.currentSrc)) continue;
      images.push({ url: bestFromSrcset(img), thumb: img.currentSrc, key: fileKey(img.currentSrc), alt: img.alt || '' });
    }
    if (images.length) ipcRenderer.send('dom:images', { images: images.slice(0, 60), path: location.pathname });
  };
  new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 900);
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  scanTimer = setTimeout(scan, 1500);
}

window.addEventListener('DOMContentLoaded', init);
