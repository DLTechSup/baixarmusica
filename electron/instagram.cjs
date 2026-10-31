// Login do Instagram: o usuário entra na página oficial dentro de uma janela do app (como num navegador).
// O app NÃO vê nem guarda a senha: só a sessão (cookies) fica neste computador e é entregue ao yt-dlp.
const { app, BrowserWindow, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const PARTITION = 'persist:sonora-instagram';
const START_URL = process.env.SONORA_IG_LOGIN_URL || 'https://www.instagram.com/accounts/login/';
const HOST_OK = new RegExp(process.env.SONORA_IG_HOSTS || '(^|\\.)(instagram\\.com|facebook\\.com|fbsbx\\.com)$', 'i');
const COOKIE_DOMAIN = process.env.SONORA_IG_COOKIE_DOMAIN || 'instagram.com';

const ses = () => session.fromPartition(PARTITION);

async function igCookies() {
  const all = await ses().cookies.get({});
  return all.filter((c) => (c.domain || '').replace(/^\./, '').endsWith(COOKIE_DOMAIN));
}

async function isConnected() {
  const cookies = await igCookies();
  const s = cookies.find((c) => c.name === 'sessionid');
  return Boolean(s && s.value);
}

/** Texto no formato Netscape (cookies.txt) que o yt-dlp entende. */
function toNetscape(cookies) {
  const farFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  const lines = ['# Netscape HTTP Cookie File'];
  for (const c of cookies) {
    const domain = c.domain || `.${COOKIE_DOMAIN}`;
    const sub = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const expiry = c.expirationDate ? Math.floor(c.expirationDate) : farFuture; // cookie de sessão: validade longa
    lines.push(`${c.httpOnly ? '#HttpOnly_' : ''}${domain}\t${sub}\t${c.path || '/'}\t${c.secure ? 'TRUE' : 'FALSE'}\t${expiry}\t${c.name}\t${c.value}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Cria um arquivo de cookies temporário (um por download, para os processos não brigarem). */
async function makeCookieFile() {
  if (!(await isConnected())) return null;
  const dir = path.join(app.getPath('userData'), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`);
  fs.writeFileSync(file, toNetscape(await igCookies()), { mode: 0o600 });
  return { file, cleanup: () => fs.rm(file, { force: true }, () => {}) };
}

function userAgent() {
  const os = process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64' : process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
}

/** Abre a janela de login. Resolve true se, ao final, a conta estiver conectada. */
function login(parent) {
  return new Promise((resolve) => {
    const w = new BrowserWindow({
      parent,
      modal: Boolean(parent),
      width: 520,
      height: 780,
      title: 'Conectar ao Instagram',
      backgroundColor: '#ffffff',
      autoHideMenuBar: true,
      webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    w.removeMenu();
    w.webContents.setUserAgent(userAgent());
    const allowed = (url) => {
      try {
        const u = new URL(url);
        return /^https?:$/.test(u.protocol) && HOST_OK.test(u.hostname);
      } catch {
        return false;
      }
    };
    w.webContents.setWindowOpenHandler(({ url }) => {
      if (allowed(url)) w.loadURL(url);
      else if (/^https?:/.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    w.webContents.on('will-navigate', (e, url) => {
      if (!allowed(url)) {
        e.preventDefault();
        if (/^https?:/.test(url)) shell.openExternal(url);
      }
    });

    let finished = false;
    const finish = async () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      const ok = await isConnected();
      if (!w.isDestroyed()) w.destroy();
      resolve(ok);
    };
    // Assim que a sessão aparece, fecha sozinho (dá um instante para o Instagram terminar de gravar os cookies).
    const timer = setInterval(async () => {
      if (await isConnected()) setTimeout(finish, 1200);
    }, 1500);
    w.on('closed', finish);
    w.loadURL(START_URL);
  });
}

async function logout() {
  await ses().clearStorageData();
  await ses().clearCache();
}

module.exports = { login, logout, isConnected, makeCookieFile, toNetscape };
