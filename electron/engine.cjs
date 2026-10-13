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

// Navegadores de onde o motor pode ler o login (cookies) para sites que exigem conta.
const BROWSERS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'vivaldi', 'chromium', 'safari'];

function commonArgs({ cookiesBrowser } = {}) {
  const args = ['--no-colors', '--encoding', 'utf-8', '--no-warnings', '--ignore-config'];
  if (BROWSERS.includes(cookiesBrowser)) args.push('--cookies-from-browser', cookiesBrowser);
  const ffmpeg = bundled('ffmpeg');
  if (ffmpeg) args.push('--ffmpeg-location', ffmpeg);
  const deno = bundled('deno');
  if (deno) args.push('--js-runtimes', `deno:${deno}`);
  return args;
}

function spawnEngine(args, opts) {
  const [cmd, pre, env] = engineCommand();
  return spawn(cmd, [...pre, ...commonArgs(opts), ...args], {
    env: { ...process.env, ...env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    windowsHide: true,
  });
}

function runEngine(args, opts) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnEngine(args, opts);
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
  if (/Unsupported URL/i.test(msg)) return 'Este link não é suportado. Veja a lista de sites suportados.';
  if (/is not a valid URL/i.test(msg)) return 'Link inválido.';
  if (/DRM/i.test(msg)) return 'Este conteúdo é protegido contra cópia (DRM) e não pode ser baixado.';
  if (/could not (find|copy).*cookie|cookies? database|failed to decrypt/i.test(msg)) {
    return 'Não foi possível ler o login do navegador escolhido. Confira se ele está instalado e se você entrou no site por ele. No Chrome e no Edge, feche o navegador e tente de novo, ou use o Firefox.';
  }
  if (/Sign in to confirm your age|age.restricted|confirm your age/i.test(msg)) {
    return 'Conteúdo com restrição de idade. Ative "Login do navegador" nas opções e tente de novo.';
  }
  if (/log ?in|sign ?in|cookies|authenticat|account|registered users|members only|premium|subscri/i.test(msg)) {
    return 'Este site exige login. Entre no site pelo seu navegador e ative "Login do navegador" nas opções.';
  }
  if (/Private (video|post|account)|is private/i.test(msg)) return 'Este conteúdo é privado.';
  if (/geo.?restrict|not available in your country|from your location/i.test(msg)) return 'Este conteúdo não está disponível no seu país.';
  if (/HTTP Error 429|Too Many Requests|rate.?limit/i.test(msg)) return 'O site limitou os acessos. Espere alguns minutos e tente de novo.';
  if (/Unable to download (webpage|JSON)|Failed to resolve|getaddrinfo|timed out|Connection|Network is unreachable/i.test(msg)) {
    return 'Não foi possível acessar o site. Verifique sua internet.';
  }
  if (/Video unavailable|not available|no longer available|has been removed|404/i.test(msg)) return 'Conteúdo indisponível ou removido.';
  if (/No video formats found|Requested format is not available/i.test(msg)) return 'Não há mídia disponível para baixar neste link.';
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

function trackUrl(e) {
  if (e.webpage_url || e.original_url) return e.webpage_url || e.original_url;
  if (e.url && /^https?:/.test(e.url)) return e.url;
  if (/youtube/i.test(e.ie_key || e.extractor_key || '') && e.id) return `https://www.youtube.com/watch?v=${e.id}`;
  return e.url || null;
}

function siteName(e) {
  const domain = e.webpage_url_domain || (() => {
    try {
      return new URL(trackUrl(e)).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  return domain || e.extractor_key || e.ie_key || '';
}

function toTrack(e) {
  const url = trackUrl(e);
  return {
    id: e.id || url,
    url,
    site: siteName(e),
    title: e.title || 'Sem título',
    artist: e.artist || e.uploader || e.channel || '',
    duration: e.duration || null,
    thumbnail: bestThumb(e),
  };
}

async function fetchInfo(url, opts) {
  const out = await runEngine(['-J', '--flat-playlist', '--', url], opts);
  const info = JSON.parse(out);
  if (info._type === 'playlist' || info._type === 'multi_video') {
    const tracks = (info.entries || [])
      .filter((e) => e && (e.id || e.url) && e.title !== '[Private video]' && e.title !== '[Deleted video]')
      .map(toTrack)
      .filter((t) => t.url);
    return {
      type: 'playlist',
      site: siteName(info),
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

// Seletor de formato para vídeo: melhor vídeo até a altura escolhida + melhor áudio.
function videoFormat(height) {
  const h = Number(height);
  const cap = h ? `[height<=${h}]` : '';
  return `bv*${cap}+ba/b${cap}/bv*+ba/b`;
}

// Baixa uma faixa como MP3 ou um vídeo como MP4. Retorna { cancel } e chama os callbacks conforme avança.
function download({ url, outDir, mode = 'audio', quality, videoQuality, embedCover, cookiesBrowser }, { onProgress, onDone, onError }) {
  const isVideo = mode === 'video';
  const args = [
    '--no-playlist',
    '--newline',
    '--progress',
    '--no-mtime',
    ...(isVideo
      ? ['-f', videoFormat(videoQuality), '--merge-output-format', 'mp4', '-S', 'vcodec:h264,acodec:aac,res']
      : ['-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', `${quality}K`]),
    '--embed-metadata',
    '--progress-template',
    `download:${PROG}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`,
    '--progress-template', `postprocess:${POST}%(progress.status)s|%(progress.postprocessor)s`,
    '--print', `after_move:${FILE}%(filepath)s`,
    '-P', outDir,
    '-o', '%(title).180B.%(ext)s',
  ];
  if (isWin) args.push('--windows-filenames');
  if (embedCover) args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg');
  args.push('--', url);

  let child;
  try {
    child = spawnEngine(args, { cookiesBrowser });
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

module.exports = { fetchInfo, download, version, BROWSERS };
