const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeTheme, safeStorage, protocol, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('./engine.cjs');

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const defaults = () => ({
  outDir: path.join(app.getPath('pictures'), 'InstaFotos'),
  videos: false,
  cookie: '', // cookie do Instagram, guardado criptografado quando o sistema permite
});

function readRaw() {
  try {
    return { ...defaults(), ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return defaults();
  }
}

function decodeCookie(stored) {
  if (!stored) return '';
  if (stored.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    } catch {
      return '';
    }
  }
  return stored.replace(/^plain:/, '');
}

function encodeCookie(cookie) {
  if (!cookie) return '';
  if (safeStorage.isEncryptionAvailable()) return `enc:${safeStorage.encryptString(cookie).toString('base64')}`;
  return `plain:${cookie}`;
}

// O renderer nunca recebe o cookie, só se há login ativo.
const publicSettings = (s) => ({ outDir: s.outDir, videos: s.videos, loggedIn: Boolean(decodeCookie(s.cookie)) });
const cookie = () => decodeCookie(readRaw().cookie);

function saveSettings(patch) {
  const next = { ...readRaw() };
  if ('outDir' in patch) next.outDir = String(patch.outDir);
  if ('videos' in patch) next.videos = Boolean(patch.videos);
  if ('cookie' in patch) next.cookie = encodeCookie(String(patch.cookie || '').trim());
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2));
  return publicSettings(next);
}

// igimg://img/?u=<url>: busca a imagem no processo principal (só hosts do Instagram) e entrega ao app.
protocol.registerSchemesAsPrivileged([{ scheme: 'igimg', privileges: { secure: true, supportFetchAPI: true } }]);
const IMG_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;

function registerImageProxy() {
  protocol.handle('igimg', async (request) => {
    try {
      const target = new URL(new URL(request.url).searchParams.get('u'));
      if (target.protocol !== 'https:' || !IMG_HOST.test(target.hostname)) return new Response('forbidden', { status: 403 });
      return await net.fetch(target.href, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.instagram.com/' } });
    } catch {
      return new Response('error', { status: 502 });
    }
  });
}

let win;
const lists = new Map();

function createWindow() {
  nativeTheme.themeSource = 'dark';
  win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#0b0b12',
    title: 'InstaFotos',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
}

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

ipcMain.handle('app:info', async () => ({ version: app.getVersion(), engine: await engine.version(), platform: process.platform }));
ipcMain.handle('settings:get', () => publicSettings(readRaw()));
ipcMain.handle('settings:set', (_e, patch) => saveSettings(patch));
ipcMain.handle('dialog:folder', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Escolha onde salvar as fotos',
    defaultPath: readRaw().outDir,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return saveSettings({ outDir: r.filePaths[0] });
});
ipcMain.handle('clipboard:read', () => clipboard.readText());
ipcMain.handle('shell:open', (_e, target) => {
  const p = target || readRaw().outDir;
  fs.mkdirSync(p, { recursive: true });
  return shell.openPath(p);
});
ipcMain.handle('shell:link', (_e, url) => /^https:\/\/(www\.)?instagram\.com\//.test(url) && shell.openExternal(url));

ipcMain.handle('list:start', (_e, { listId, target }) => {
  lists.get(listId)?.cancel();
  const job = engine.run(['list', '--target', String(target), ...(cookie() ? ['--sessionid', cookie()] : [])], (event) =>
    send('list:event', { listId, event }),
  );
  lists.set(listId, job);
  job.done.then(() => lists.get(listId) === job && lists.delete(listId));
});
ipcMain.handle('list:cancel', (_e, listId) => {
  lists.get(listId)?.cancel();
  lists.delete(listId);
});

ipcMain.handle('photo:download', async (_e, shortcode) => {
  if (!/^[A-Za-z0-9_-]{5,20}$/.test(String(shortcode))) return { ok: false, error: 'Post inválido.' };
  const { outDir, videos } = readRaw();
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    return { ok: false, error: `Não foi possível criar a pasta: ${err.message}` };
  }
  const result = { ok: false, files: [], folder: null, error: null };
  const args = ['download', '--shortcode', shortcode, '--out', outDir, ...(videos ? ['--videos'] : []), ...(cookie() ? ['--sessionid', cookie()] : [])];
  await engine.run(args, (ev) => {
    if (ev.type === 'file') result.files.push(ev.path);
    else if (ev.type === 'done') {
      result.ok = true;
      result.folder = ev.folder;
    } else if (ev.type === 'error') result.error = ev.message;
  }).done;
  return result;
});

app.whenReady().then(() => {
  registerImageProxy();
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => {
  for (const job of lists.values()) job.cancel();
  if (process.platform !== 'darwin') app.quit();
});
