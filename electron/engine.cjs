// Ponte entre o app e o motor yt-dlp: localiza os binários e executa os comandos.
const { app } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const isWin = process.platform === 'win32';
const exe = (name) => (isWin ? `${name}.exe` : name);

function binDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(__dirname, '..', 'resources', 'bin');
}

function bundled(name) {
  const p = path.join(binDir(), exe(name));
  return fs.existsSync(p) ? p : null;
}

// Retorna [comando, argsIniciais, envExtra] para chamar o yt-dlp.
// Preferência: executável compilado em resources/bin; em desenvolvimento,
// cai para o código-fonte em engine/yt-dlp rodando com o Python do sistema.
function engineCommand() {
  const compiled = bundled('yt-dlp');
  if (compiled) return [compiled, [], {}];
  const source = path.join(__dirname, '..', 'engine', 'yt-dlp');
  return [isWin ? 'python' : 'python3', ['-m', 'yt_dlp'], { PYTHONPATH: source }];
}

function commonArgs() {
  const args = ['--no-colors', '--encoding', 'utf-8', '--no-warnings', '--ignore-config'];
  const ffmpeg = bundled('ffmpeg');
  if (ffmpeg) args.push('--ffmpeg-location', ffmpeg);
  const deno = bundled('deno');
  if (deno) args.push('--js-runtimes', `deno:${deno}`);
  return args;
}

function spawnEngine(args) {
  const [cmd, pre, env] = engineCommand();
  return spawn(cmd, [...pre, ...commonArgs(), ...args], {
    env: { ...process.env, ...env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    windowsHide: true,
  });
}

function runEngine(args) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnEngine(args);
    } catch (err) {
      return reject(err);
    }
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(cleanError(err) || `O motor terminou com código ${code}`));
    });
  });
}

function cleanError(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.startsWith('ERROR:'));
  const msg = (lines.at(-1) || String(text).trim().split(/\r?\n/).at(-1) || '')
    .replace(/^ERROR:\s*/, '')
    .replace(/;\s*please report this issue.*$/i, '')
    .replace(/^\[[^\]]+\]\s*(?:[\w-]+:\s*)?/, '');
  if (/Unsupported URL/i.test(msg)) return 'Link não suportado. Cole um link do YouTube.';
  if (/Unable to download webpage|Failed to resolve|getaddrinfo|timed out|Connection/i.test(msg)) return 'Sem conexão com o YouTube. Verifique sua internet.';
  if (/Private video/i.test(msg)) return 'Este vídeo é privado.';
  if (/Video unavailable|not available/i.test(msg)) return 'Vídeo indisponível.';
  if (/Sign in to confirm your age/i.test(msg)) return 'Vídeo com restrição de idade.';
  if (/is not a valid URL/i.test(msg)) return 'Link inválido.';
  return msg;
}

function bestThumb(info) {
  if (info.thumbnail) return info.thumbnail;
  const list = info.thumbnails || [];
  const sized = list.filter((t) => t.url && t.width).sort((a, b) => b.width - a.width);
  if (sized.length) return (sized.find((t) => t.width <= 720) || sized[0]).url;
  if (list.length) return list.at(-1).url;
  return info.id && /youtube/i.test(info.ie_key || info.extractor || '')
    ? `https://i.ytimg.com/vi/${info.id}/mqdefault.jpg`
    : null;
}

function toTrack(e) {
  const url = e.webpage_url || e.original_url
    || (e.url && /^https?:/.test(e.url) ? e.url : `https://www.youtube.com/watch?v=${e.id}`);
  return {
    id: e.id,
    url,
    title: e.title || 'Sem título',
    artist: e.artist || e.uploader || e.channel || '',
    duration: e.duration || null,
    thumbnail: bestThumb(e),
  };
}

async function fetchInfo(url) {
  const out = await runEngine(['-J', '--flat-playlist', url]);
  const info = JSON.parse(out);
  if (info._type === 'playlist') {
    const tracks = (info.entries || []).filter((e) => e && e.id && e.title !== '[Private video]' && e.title !== '[Deleted video]').map(toTrack);
    return {
      type: 'playlist',
      title: info.title || 'Playlist',
      artist: info.uploader || info.channel || '',
      thumbnail: bestThumb(info) || tracks[0]?.thumbnail || null,
      tracks,
    };
  }
  return { type: 'track', ...toTrack(info) };
}

async function version() {
  try {
    return (await runEngine(['--version'])).trim();
  } catch {
    return null;
  }
}

const PROG = '__PROG__';
const POST = '__POST__';
const FILE = '__FILE__';

// Baixa uma faixa como MP3. Retorna { cancel } e chama os callbacks conforme avança.
function download({ url, outDir, quality, embedCover }, { onProgress, onDone, onError }) {
  const args = [
    '--no-playlist',
    '--newline',
    '--progress',
    '--no-mtime',
    '-f', 'bestaudio/best',
    '-x', '--audio-format', 'mp3', '--audio-quality', `${quality}K`,
    '--embed-metadata',
    '--progress-template',
    `download:${PROG}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`,
    '--progress-template', `postprocess:${POST}%(progress.status)s|%(progress.postprocessor)s`,
    '--print', `after_move:${FILE}%(filepath)s`,
    '-P', outDir,
    '-o', '%(title)s.%(ext)s',
  ];
  if (isWin) args.push('--windows-filenames');
  if (embedCover) args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg');
  args.push('--', url);

  let child;
  try {
    child = spawnEngine(args);
  } catch (err) {
    onError(err.message);
    return { cancel() {} };
  }

  let file = null;
  let stderr = '';
  let cancelled = false;
  const num = (v) => (v === 'NA' || v === 'None' || v === '' ? null : Number(v));

  const handleLine = (line) => {
    if (line.startsWith(PROG)) {
      const [done, total, estimate, speed, eta] = line.slice(PROG.length).split('|').map(num);
      const size = total || estimate;
      onProgress({ stage: 'download', percent: size ? Math.min(100, (done / size) * 100) : null, speed, eta });
    } else if (line.startsWith(POST)) {
      // A conversão de miniaturas roda antes do download; só as etapas seguintes contam como "convertendo".
      if (!line.includes('ThumbnailsConvertor')) onProgress({ stage: 'convert', percent: null });
    } else if (line.startsWith(FILE)) {
      file = line.slice(FILE.length).trim();
    } else {
      return false;
    }
    return true;
  };

  // O yt-dlp manda parte do progresso (ex.: conversão) pelo stderr, então lemos os dois.
  const lineReader = (onOther) => {
    let buffer = '';
    return (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) if (!handleLine(line)) onOther(line);
    };
  };
  child.stdout.on('data', lineReader(() => {}));
  child.stderr.on('data', lineReader((line) => (stderr += `${line}\n`)));
  child.on('error', (err) => onError(err.code === 'ENOENT' ? 'Motor yt-dlp não encontrado.' : err.message));
  child.on('close', (code) => {
    if (cancelled) return;
    if (code === 0) onDone({ file });
    else onError(cleanError(stderr) || `O motor terminou com código ${code}`);
  });

  return {
    cancel() {
      cancelled = true;
      if (isWin && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill('SIGTERM');
    },
  };
}

module.exports = { fetchInfo, download, version };
