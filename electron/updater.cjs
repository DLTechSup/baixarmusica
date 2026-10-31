// Atualização do motor: baixa o yt-dlp oficial mais recente do GitHub e passa a usá-lo no lugar do embutido.
const { app, net } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Em testes, SONORA_UPDATE_BASE aponta para um servidor local que imita o GitHub.
const API = process.env.SONORA_UPDATE_API || 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest';
const DOWNLOAD = process.env.SONORA_UPDATE_DOWNLOAD || 'https://github.com/yt-dlp/yt-dlp/releases/download';

const isWin = process.platform === 'win32';

function assetName() {
  const arch = process.arch;
  if (process.platform === 'win32') return arch === 'arm64' ? 'yt-dlp_arm64.exe' : arch === 'ia32' ? 'yt-dlp_x86.exe' : 'yt-dlp.exe';
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
}

const engineDir = () => path.join(app.getPath('userData'), 'engine');
const installedPath = () => path.join(engineDir(), isWin ? 'yt-dlp.exe' : 'yt-dlp');

// "2026.08.19" < "2026.08.19.1" < "2026.10.01"
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

async function getJson(url) {
  const res = await net.fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Sonora-Updater' } });
  if (!res.ok) throw new Error(`O GitHub respondeu ${res.status}.`);
  return res.json();
}

function friendly(err) {
  const msg = String(err && err.message ? err.message : err);
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|net::|ERR_/i.test(msg) || /ENOTFOUND|network/i.test(String(err && err.cause))) {
    return 'Não foi possível acessar o GitHub. Verifique sua internet.';
  }
  if (/403|429/.test(msg)) return 'O GitHub limitou as consultas. Tente de novo em alguns minutos.';
  return msg;
}

/** Consulta a última versão. current = versão em uso hoje. */
async function checkLatest(current) {
  try {
    const release = await getJson(API);
    const latest = String(release.tag_name || '').replace(/^v/, '');
    if (!latest) throw new Error('Resposta inesperada do GitHub.');
    return { ok: true, current: current || null, latest, available: !current || compareVersions(current, latest) < 0 };
  } catch (err) {
    return { ok: false, error: friendly(err) };
  }
}

async function download(url, dest, onProgress) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'Sonora-Updater' }, redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Falha ao baixar o motor (${res.status}).`);
  const total = Number(res.headers.get('content-length')) || 0;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(dest);
  let done = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    hash.update(value);
    done += value.length;
    if (!out.write(value)) await new Promise((r) => out.once('drain', r));
    if (total) onProgress(Math.min(99, (done / total) * 100));
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  return hash.digest('hex');
}

/** Baixa a versão `tag`, confere o SHA-256 e instala em userData/engine. */
async function install(tag, onProgress) {
  const name = assetName();
  const dir = engineDir();
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `${name}.download`);
  try {
    const sums = await (await net.fetch(`${DOWNLOAD}/${tag}/SHA2-256SUMS`, { headers: { 'User-Agent': 'Sonora-Updater' } })).text();
    const line = sums.split(/\r?\n/).find((l) => l.trim().endsWith(` ${name}`) || l.trim().endsWith(`*${name}`));
    const expected = line && line.trim().split(/\s+/)[0];
    if (!expected || !/^[0-9a-f]{64}$/i.test(expected)) throw new Error('Não encontrei a assinatura (SHA-256) desta versão. Atualização cancelada por segurança.');

    const actual = await download(`${DOWNLOAD}/${tag}/${name}`, tmp, onProgress);
    if (actual.toLowerCase() !== expected.toLowerCase()) throw new Error('O arquivo baixado não confere com a assinatura (SHA-256). Atualização cancelada.');
    if (!isWin) fs.chmodSync(tmp, 0o755);

    // Testa o motor novo antes de trocar.
    const probe = spawnSync(tmp, ['--version'], { encoding: 'utf8', timeout: 60000, windowsHide: true });
    const got = String(probe.stdout || '').trim();
    if (probe.status !== 0 || compareVersions(got, tag) !== 0) throw new Error('O motor novo não passou no teste e não foi instalado.');

    const target = installedPath();
    const old = `${target}.old`;
    fs.rmSync(old, { force: true });
    if (fs.existsSync(target)) fs.renameSync(target, old);
    try {
      fs.renameSync(tmp, target);
    } catch (err) {
      if (fs.existsSync(old)) fs.renameSync(old, target);
      throw err;
    }
    fs.rmSync(old, { force: true });
    onProgress(100);
    return { ok: true, version: got };
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    return { ok: false, error: friendly(err) };
  }
}

/** Remove o motor baixado e volta ao que veio no instalador. */
function reset() {
  fs.rmSync(installedPath(), { force: true });
  return { ok: true };
}

module.exports = { checkLatest, install, reset, installedPath, compareVersions };
