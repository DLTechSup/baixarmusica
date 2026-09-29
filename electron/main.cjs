const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeTheme } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('./engine.cjs');

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const defaults = () => ({
  outDir: path.join(app.getPath('music'), 'Sonora'),
  quality: 320,
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
  platform: process.platform,
}));
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (_e, patch) => saveSettings(patch));
ipcMain.handle('dialog:folder', async () => {
  const current = loadSettings().outDir;
  const r = await dialog.showOpenDialog(win, {
    title: 'Escolha onde salvar as músicas',
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

ipcMain.handle('media:fetch', async (_e, url) => {
  try {
    return { ok: true, data: await engine.fetchInfo(url) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('download:start', (_e, { jobId, url }) => {
  const { outDir, quality, embedCover } = loadSettings();
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    send('download:error', { jobId, error: `Não foi possível criar a pasta: ${err.message}` });
    return;
  }
  const job = engine.download(
    { url, outDir, quality, embedCover },
    {
      onProgress: (p) => send('download:progress', { jobId, ...p }),
      onDone: ({ file }) => {
        jobs.delete(jobId);
        send('download:done', { jobId, file });
      },
      onError: (error) => {
        jobs.delete(jobId);
        send('download:error', { jobId, error });
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
