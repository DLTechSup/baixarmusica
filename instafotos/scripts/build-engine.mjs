// Compila o motor (engine/igfetch.py + Instaloader) em um executável único com PyInstaller
// e copia o resultado para resources/bin, de onde o Electron o empacota.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, 'resources', 'bin');
const venvDir = join(root, '.venv-engine');
const workDir = join(root, 'build-engine');
const isWin = process.platform === 'win32';

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root });
  if (r.status !== 0) {
    console.error(`Falha ao executar: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

function findPython() {
  const candidates = process.env.PYTHON ? [process.env.PYTHON] : isWin ? ['py', 'python'] : ['python3', 'python'];
  for (const c of candidates) {
    const r = spawnSync(c, ['-c', 'import sys; assert sys.version_info >= (3, 9); print(sys.executable)'], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim();
  }
  console.error('Python 3.9+ não encontrado. Instale o Python ou defina a variável PYTHON.');
  process.exit(1);
}

const python = isWin ? join(venvDir, 'Scripts', 'python.exe') : join(venvDir, 'bin', 'python');
if (!existsSync(python)) run(findPython(), ['-m', 'venv', venvDir]);

run(python, ['-m', 'pip', 'install', '-U', 'pip']);
run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt']);
run(python, [
  '-m', 'PyInstaller', '--onefile', '--clean', '--noconfirm',
  '--name', 'igfetch',
  '--distpath', join(workDir, 'dist'),
  '--workpath', join(workDir, 'work'),
  '--specpath', workDir,
  '--collect-submodules', 'instaloader',
  join('engine', 'igfetch.py'),
]);

const built = join(workDir, 'dist', isWin ? 'igfetch.exe' : 'igfetch');
if (!existsSync(built)) {
  console.error(`Executável não encontrado em ${built}`);
  process.exit(1);
}
mkdirSync(binDir, { recursive: true });
const dest = join(binDir, isWin ? 'igfetch.exe' : 'igfetch');
copyFileSync(built, dest);
if (!isWin) chmodSync(dest, 0o755);
console.log(`Motor pronto: ${dest}`);
