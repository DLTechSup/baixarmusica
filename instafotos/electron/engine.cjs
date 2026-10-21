// Ponte entre o app e o motor igfetch: localiza o executável e lê os eventos JSON.
const { app } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const isWin = process.platform === 'win32';

function command() {
  const dir = app.isPackaged ? path.join(process.resourcesPath, 'bin') : path.join(__dirname, '..', 'resources', 'bin');
  const compiled = path.join(dir, isWin ? 'igfetch.exe' : 'igfetch');
  if (fs.existsSync(compiled)) return [compiled, []];
  // Em desenvolvimento, cai para o script Python (precisa de: pip install -r requirements.txt).
  return [isWin ? 'python' : 'python3', [path.join(__dirname, '..', 'engine', 'igfetch.py')]];
}

// Executa o motor e chama onEvent para cada linha JSON. Retorna { cancel, done }.
function run(args, onEvent) {
  const [cmd, pre] = command();
  let child;
  let cancelled = false;
  const done = new Promise((resolve) => {
    try {
      child = spawn(cmd, [...pre, ...args], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        windowsHide: true,
      });
    } catch (err) {
      onEvent({ type: 'error', code: 'engine', message: err.message });
      return resolve(false);
    }
    let failed = false;
    let buffer = '';
    let stderr = '';
    const flush = (line) => {
      if (!line.trim()) return;
      try {
        const ev = JSON.parse(line);
        if (ev.type === 'error') failed = true;
        onEvent(ev);
      } catch {
        stderr += `${line}\n`;
      }
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      lines.forEach(flush);
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      failed = true;
      onEvent({
        type: 'error',
        code: 'engine',
        message: err.code === 'ENOENT' ? 'Motor do InstaFotos não encontrado.' : err.message,
      });
      resolve(false);
    });
    child.on('close', (code) => {
      flush(buffer);
      if (!cancelled && code !== 0 && !failed) {
        const last = stderr.trim().split(/\r?\n/).at(-1) || `O motor terminou com código ${code}`;
        onEvent({ type: 'error', code: 'engine', message: last });
      }
      resolve(code === 0 && !failed);
    });
  });
  return {
    done,
    cancel() {
      cancelled = true;
      if (!child) return;
      if (isWin && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill('SIGTERM');
    },
  };
}

async function version() {
  let v = null;
  await run(['version'], (ev) => ev.type === 'version' && (v = ev.version)).done;
  return v;
}

module.exports = { run, version };
