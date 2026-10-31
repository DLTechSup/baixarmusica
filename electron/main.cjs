const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeTheme } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('./engine.cjs');
const updater = require('./updater.cjs');
const instagram = require('./instagram.cjs');

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const defaults = () => ({
  outDir: path.join(app.getPath('music'), 'Sonora'),
  mode: 'audio',
  quality: 320,
  videoQuality: 1080,
  embedCover: true,
  concurrency: 2,
});

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

let win;
const jobs = new Map();

function createWindow() {
  nativeTheme.themeSource = 'dark';
  win = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#0b0b12',
    title: 'Sonora',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? true : { color: '#00000000', symbolColor: '#c9c9d6', height: 44 },
    trafficLightPosition: { x: 16, y: 14 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  engine: await engine.version(),
  engineSource: engine.engineSource(),
  platform: process.platform,
}));

// ----- Motor: verificar e instalar atualização -----
ipcMain.handle('engine:check', async () => {
  const current = await engine.version();
  const res = await updater.checkLatest(current);
  return { ...res, source: engine.engineSource() };
});
ipcMain.handle('engine:update', async (_e, tag) => {
  if (!/^\d{4}\.\d{2}\.\d{2}(\.\d+)?$/.test(String(tag))) return { ok: false, error: 'Versão inválida.' };
  if (jobs.size > 0) return { ok: false, error: 'Há downloads em andamento. Espere terminar (ou cancele) e tente de novo.' };
  const res = await updater.install(String(tag), (percent) => send('engine:progress', { percent }));
  return res.ok ? { ...res, version: await engine.version(), source: engine.engineSource() } : res;
});
ipcMain.handle('engine:reset', async () => {
  if (jobs.size > 0) return { ok: false, error: 'Há downloads em andamento.' };
  updater.reset();
  return { ok: true, version: await engine.version(), source: engine.engineSource() };
});

// ----- Instagram: conectar / desconectar a conta -----
ipcMain.handle('instagram:status', () => instagram.isConnected());
ipcMain.handle('instagram:login', async () => instagram.login(win));
ipcMain.handle('instagram:logout', async () => {
  await instagram.logout();
  return false;
});
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (_e, patch) => saveSettings(patch));
ipcMain.handle('dialog:folder', async () => {
  const current = loadSettings().outDir;
  const r = await dialog.showOpenDialog(win, {
    title: 'Escolha onde salvar os downloads',
    defaultPath: current,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return saveSettings({ outDir: r.filePaths[0] });
});
ipcMain.handle('clipboard:read', () => clipboard.readText());
ipcMain.handle('shell:show', (_e, file) => file && fs.existsSync(file) && shell.showItemInFolder(file));
ipcMain.handle('shell:open', (_e, target) => {
  const p = target || loadSettings().outDir;
  fs.mkdirSync(p, { recursive: true });
  return shell.openPath(p);
});

// Para links do Instagram, usa a sessão conectada em Configurações (se houver).
async function cookiesFor(url) {
  return engine.isInstagramUrl(url) ? instagram.makeCookieFile() : null;
}
const errorCode = (message) => (message === engine.LOGIN_MSG ? 'login' : undefined);

ipcMain.handle('media:fetch', async (_e, url) => {
  const cookies = await cookiesFor(url);
  try {
    return { ok: true, data: await engine.fetchInfo(url, { cookiesFile: cookies?.file }) };
  } catch (err) {
    return { ok: false, error: err.message, code: errorCode(err.message) };
  } finally {
    cookies?.cleanup();
  }
});

ipcMain.handle('download:start', async (_e, { jobId, url, mode, quality, videoQuality }) => {
  const settings = loadSettings();
  const { outDir, embedCover } = settings;
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    send('download:error', { jobId, error: `Não foi possível criar a pasta: ${err.message}` });
    return;
  }
  const cookies = await cookiesFor(url);
  const job = engine.download(
    {
      url,
      cookiesFile: cookies?.file,
      outDir,
      mode: mode || settings.mode,
      quality: quality || settings.quality,
      videoQuality: videoQuality || settings.videoQuality,
      embedCover,
    },
    {
      onProgress: (p) => send('download:progress', { jobId, ...p }),
      onDone: ({ file }) => {
        jobs.delete(jobId);
        cookies?.cleanup();
        send('download:done', { jobId, file });
      },
      onError: (error) => {
        jobs.delete(jobId);
        cookies?.cleanup();
        send('download:error', { jobId, error, code: errorCode(error) });
      },
    },
  );
  jobs.set(jobId, job);
});

ipcMain.handle('download:cancel', (_e, jobId) => {
  jobs.get(jobId)?.cancel();
  jobs.delete(jobId);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => {
  for (const job of jobs.values()) job.cancel();
  if (process.platform !== 'darwin') app.quit();
});
