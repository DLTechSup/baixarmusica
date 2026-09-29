// Compila o motor yt-dlp (engine/yt-dlp) em um executável único com PyInstaller
// e copia o resultado para resources/bin, de onde o Electron o empacota.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, chmodSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engineDir = join(root, 'engine', 'yt-dlp');
const binDir = join(root, 'resources', 'bin');
const venvDir = join(root, '.venv-engine');
const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: engineDir, ...opts });
  if (r.status !== 0) {
    console.error(`Falha ao executar: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

function findPython() {
  const candidates = process.env.PYTHON ? [process.env.PYTHON] : isWin ? ['py', 'python'] : ['python3', 'python'];
  for (const c of candidates) {
    const r = spawnSync(c, ['-c', 'import sys; assert sys.version_info >= (3, 10); print(sys.executable)'], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim();
  }
  console.error('Python 3.10+ não encontrado. Instale o Python ou defina a variável PYTHON.');
  process.exit(1);
}

const venvPython = isWin ? join(venvDir, 'Scripts', 'python.exe') : join(venvDir, 'bin', 'python');
if (!existsSync(venvPython)) run(findPython(), ['-m', 'venv', venvDir]);

run(venvPython, ['-m', 'pip', 'install', '-U', 'pip']);
run(venvPython, ['devscripts/install_deps.py', '--include-extra', 'pyinstaller']);
run(venvPython, ['devscripts/make_lazy_extractors.py']);
run(venvPython, ['-m', 'bundle.pyinstaller', '--onefile']);

const built = readdirSync(join(engineDir, 'dist')).find((f) => f.startsWith('yt-dlp'));
if (!built) {
  console.error('Executável do yt-dlp não encontrado em engine/yt-dlp/dist');
  process.exit(1);
}
mkdirSync(binDir, { recursive: true });
const target = join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');
copyFileSync(join(engineDir, 'dist', built), target);
if (!isWin) chmodSync(target, 0o755);
console.log(`Motor pronto: ${target}`);
