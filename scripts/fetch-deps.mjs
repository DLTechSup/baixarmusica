// Prepara as ferramentas auxiliares do motor em resources/bin:
//  - ffmpeg (conversão para MP3), vindo do pacote ffmpeg-static
//  - deno (runtime JavaScript que o yt-dlp usa para resolver os desafios do YouTube)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, copyFileSync, chmodSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, 'resources', 'bin');
const isWin = process.platform === 'win32';
const exe = (name) => (isWin ? `${name}.exe` : name);

mkdirSync(binDir, { recursive: true });

// ffmpeg
const ffmpegSrc = require('ffmpeg-static');
if (!ffmpegSrc || !existsSync(ffmpegSrc)) {
  console.error('ffmpeg-static não baixou o binário. Rode "npm install" novamente.');
  process.exit(1);
}
const ffmpegDst = join(binDir, exe('ffmpeg'));
copyFileSync(ffmpegSrc, ffmpegDst);
if (!isWin) chmodSync(ffmpegDst, 0o755);
console.log(`ffmpeg pronto: ${ffmpegDst}`);

// deno
const denoTargets = {
  'win32-x64': 'x86_64-pc-windows-msvc',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
};
const triple = denoTargets[`${process.platform}-${process.arch}`];
const denoDst = join(binDir, exe('deno'));
if (!triple) {
  console.warn(`Deno não disponível para ${process.platform}-${process.arch}; o app usará o deno do sistema, se houver.`);
} else if (existsSync(denoDst) && !process.argv.includes('--force')) {
  console.log(`deno já existe: ${denoDst}`);
} else {
  const url = `https://github.com/denoland/deno/releases/latest/download/deno-${triple}.zip`;
  console.log(`Baixando ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Falha ao baixar o deno (${res.status}).`);
    process.exit(1);
  }
  const zipPath = join(binDir, 'deno.zip');
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  await extract(zipPath, { dir: binDir });
  rmSync(zipPath);
  if (!isWin) chmodSync(denoDst, 0o755);
  console.log(`deno pronto: ${denoDst}`);
}
