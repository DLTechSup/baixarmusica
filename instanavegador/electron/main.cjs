const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell, nativeTheme, protocol, net, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { extractFromBody, extractFromHtml, fileKey } = require('./media.cjs');
const { createDownloader } = require('./downloader.cjs');

const HOME_URL = process.env.INSTANAV_START_URL || 'https://www.instagram.com/';
const ALLOWED_HOST = new RegExp(process.env.INSTANAV_ALLOW_HOST || '(^|\\.)(instagram\\.com|facebook\\.com|fbsbx\\.com)$', 'i');
const IMG_HOST = new RegExp(process.env.INSTANAV_IMG_HOST || '(^|\\.)(cdninstagram\\.com|fbcdn\\.net)$', 'i');
const PARTITION = 'persist:instagram'; // o login do Instagram fica guardado aqui, separado de qualquer outro navegador

// ---------- configurações ----------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const defaults = () => ({ outDir: path.join(app.getPath('pictures'), 'InstaNavegador'), noticeAccepted: false, panelOpen: true });
function loadSettings() {
  try {
    return { ...defaults(), ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return defaults();
  }
}
function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2));
  return next;
}

// ---------- miniaturas: o app busca a imagem para o Instagram não bloquear o carregamento direto ----------
protocol.registerSchemesAsPrivileged([{ scheme: 'igimg', privileges: { secure: true, supportFetchAPI: true } }]);
function registerImageProxy() {
  protocol.handle('igimg', async (request) => {
    try {
      const target = new URL(new URL(request.url).searchParams.get('u'));
      if (!/^https?:$/.test(target.protocol) || !IMG_HOST.test(target.hostname)) return new Response('forbidden', { status: 403 });
      return await net.fetch(target.href, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    } catch {
      return new Response('error', { status: 502 });
    }
  });
}

// ---------- estado ----------
let win;
let view;
let currentPath = '/';
const catalog = new Map(); // id -> entrada de mídia
let seq = 0;
let pendingAdd = [];
let flushTimer;

const send = (channel, payload) => win && !win.isDestroyed() && win.webContents.send(channel, payload);

function addEntries(entries, source = 'api') {
  for (const e of entries) {
    const old = catalog.get(e.id);
    if (old && old.source === 'api') continue;
    const entry = { ...e, source, page: currentPath, seq: old ? old.seq : ++seq };
    catalog.set(e.id, entry);
    pendingAdd.push(entry);
  }
  if (pendingAdd.length && !flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const batch = pendingAdd;
      pendingAdd = [];
      send('media:event', { type: 'add', entries: batch });
    }, 150);
  }
}

const downloader = createDownloader({
  getOutDir: () => loadSettings().outDir,
  onState: (state) => send('download:state', state),
});

// ---------- leitura das respostas do Instagram (a página já está logada e faz os pedidos sozinha) ----------
function attachNetworkReader(wc) {
  const dbg = wc.debugger;
  try {
    dbg.attach('1.3');
  } catch {
    return;
  }
  dbg.sendCommand('Network.enable').catch(() => {});
  const tracked = new Map();
  dbg.on('message', (_e, method, params) => {
    if (method === 'Network.responseReceived') {
      const { url, mimeType } = params.response;
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        return;
      }
      if (!ALLOWED_HOST.test(host)) return;
      const isData = params.type === 'Document' || (/(\/api\/v1\/|\/graphql|\/api\/graphql)/.test(url) && /json|javascript|text\/plain/i.test(mimeType || ''));
      if (isData) tracked.set(params.requestId, params.type);
    } else if (method === 'Network.loadingFinished' && tracked.has(params.requestId)) {
      const type = tracked.get(params.requestId);
      tracked.delete(params.requestId);
      if (params.encodedDataLength > 12e6) return;
      dbg
        .sendCommand('Network.getResponseBody', { requestId: params.requestId })
        .then(({ body, base64Encoded }) => {
          const text = base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
          addEntries(type === 'Document' ? extractFromHtml(text) : extractFromBody(text));
        })
        .catch(() => {});
    }
  });
}

function navState() {
  if (!view || view.webContents.isDestroyed()) return null;
  const wc = view.webContents;
  let p = '/';
  try {
    p = new URL(wc.getURL()).pathname;
  } catch {
    /* sem url */
  }
  currentPath = p;
  return {
    url: wc.getURL(),
    path: p,
    title: wc.getTitle(),
    loading: wc.isLoading(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
  };
}

function sendNavState() {
  const state = navState();
  if (state) send('nav:state', state);
}

function sameApp(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) && ALLOWED_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

function createInstagramView() {
  view = new WebContentsView({
    webPreferences: {
      partition: PARTITION,
      preload: path.join(__dirname, 'page-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const wc = view.webContents;
  // Sem "Electron/x.y" no user agent, o Instagram entrega o site normal.
  wc.setUserAgent(`Mozilla/5.0 (${process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64' : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`);
  wc.setWindowOpenHandler(({ url }) => {
    if (sameApp(url)) wc.loadURL(url);
    else if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!sameApp(url)) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  for (const ev of ['did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading', 'page-title-updated']) wc.on(ev, sendNavState);
  wc.on('context-menu', (_e, params) => {
    if (params.mediaType !== 'image' || !params.srcURL) return;
    Menu.buildFromTemplate([{ label: 'Baixar esta imagem', click: () => downloadFromPage({ kind: 'image', src: params.srcURL, keys: [fileKey(params.srcURL)] }) }]).popup();
  });
  win.contentView.addChildView(view);
  attachNetworkReader(wc);
  wc.loadURL(HOME_URL);
}

// ---------- download iniciado pelo botão sobre a foto/vídeo ----------
function toast(text) {
  if (view && !view.webContents.isDestroyed()) view.webContents.send('overlay:toast', text);
}

function downloadFromPage(d) {
  const all = [...catalog.values()];
  let entry = null;
  if (d.kind === 'video') {
    entry = (d.posterKey && all.find((e) => e.kind === 'video' && e.keys.includes(d.posterKey)))
      || all.find((e) => e.kind === 'video' && d.path && d.path.includes(`/${e.code}/`))
      || null;
  } else {
    entry = all.find((e) => e.source === 'api' && e.kind === 'photo' && (d.keys || []).some((k) => e.keys.includes(k))) || null;
  }
  if (!entry && d.kind === 'image' && d.src) {
    const code = (d.path.match(/\/(?:p|reel|reels|tv)\/([^/]+)/) || [])[1] || fileKey(d.src).replace(/\W/g, '').slice(0, 24);
    entry = { id: `dom_${code}_${fileKey(d.src)}`, code, index: 1, count: 1, owner: '', kind: 'photo', url: d.src, taken: 0, keys: [] };
  }
  if (!entry) {
    toast('Não achei o link deste vídeo ainda. Aperte play, espere carregar e tente de novo.');
    return;
  }
  downloader.enqueue([entry]);
  toast(entry.kind === 'video' ? '⬇ Baixando o vídeo…' : '⬇ Baixando a foto…');
  send('media:event', { type: 'focus' });
}

ipcMain.on('overlay:download', (_e, d) => downloadFromPage(d));
ipcMain.on('dom:images', (_e, { images, path: p }) => {
  const known = new Set([...catalog.values()].flatMap((e) => e.keys || []));
  const fresh = images
    .filter((i) => i.url && !known.has(i.key))
    .map((i) => ({
      id: `dom_${i.key}`,
      code: (p.match(/\/(?:p|reel|reels|tv)\/([^/]+)/) || [])[1] || i.key.replace(/\W/g, '').slice(0, 24),
      index: 1, count: 1, owner: (p.split('/')[1] || '').replace(/^(p|reel|reels|explore)$/, ''),
      kind: 'photo', reel: false, thumb: i.thumb, url: i.url, keys: [i.key], caption: i.alt.slice(0, 140), taken: 0,
    }));
  if (fresh.length) addEntries(fresh, 'dom');
});

// ---------- janela ----------
function createWindow() {
  nativeTheme.themeSource = 'dark';
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0b12',
    title: 'InstaNavegador',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  createInstagramView();
  win.on('closed', () => {
    win = null;
    view = null;
  });
}

ipcMain.on('view:bounds', (_e, r) => {
  if (!view) return;
  view.setBounds({ x: Math.round(r.x), y: Math.round(r.y), width: Math.max(0, Math.round(r.width)), height: Math.max(0, Math.round(r.height)) });
});
ipcMain.on('view:visible', (_e, visible) => view && view.setVisible(Boolean(visible)));

ipcMain.handle('nav', (_e, { action, arg }) => {
  const wc = view?.webContents;
  if (!wc) return;
  if (action === 'back') wc.navigationHistory.canGoBack() && wc.navigationHistory.goBack();
  else if (action === 'forward') wc.navigationHistory.canGoForward() && wc.navigationHistory.goForward();
  else if (action === 'reload') wc.reload();
  else if (action === 'home') wc.loadURL(HOME_URL);
  else if (action === 'go') {
    let text = String(arg || '').trim();
    if (!text) return;
    if (text.startsWith('@')) text = `https://www.instagram.com/${text.slice(1)}/`;
    else if (!/^https?:\/\//i.test(text)) text = /^[\w.]+$/.test(text) ? `https://www.instagram.com/${text}/` : `https://${text}`;
    if (sameApp(text)) wc.loadURL(text);
  }
});

ipcMain.handle('nav:get', () => navState());
ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform }));
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (_e, patch) => {
  const allowed = {};
  if ('noticeAccepted' in patch) allowed.noticeAccepted = Boolean(patch.noticeAccepted);
  if ('panelOpen' in patch) allowed.panelOpen = Boolean(patch.panelOpen);
  return saveSettings(allowed);
});
ipcMain.handle('dialog:folder', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Escolha onde salvar', defaultPath: loadSettings().outDir, properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  return saveSettings({ outDir: r.filePaths[0] });
});
ipcMain.handle('shell:open', () => {
  const dir = loadSettings().outDir;
  fs.mkdirSync(dir, { recursive: true });
  return shell.openPath(dir);
});
ipcMain.handle('shell:show', (_e, file) => file && fs.existsSync(file) && shell.showItemInFolder(file));

ipcMain.handle('media:get', () => [...catalog.values()]);
ipcMain.handle('media:clear', () => {
  catalog.clear();
  pendingAdd = [];
  send('media:event', { type: 'reset' });
});
ipcMain.handle('download:start', (_e, ids) => downloader.enqueue((ids || []).map((id) => catalog.get(id)).filter(Boolean)));
ipcMain.handle('download:cancel', (_e, id) => downloader.cancel(id));

app.whenReady().then(() => {
  registerImageProxy();
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => app.quit());
