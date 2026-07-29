#!/usr/bin/env node
/**
 * Native desktop dev: build Go extension + UI, stage into neutralino/, open Neutralino window.
 * Go engine runs as Neutralino extension (neutralino-ext-go), not a separate HTTP sidecar.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const neuDir = path.join(root, 'neutralino');
const extBinary = path.join(
  neuDir,
  'extensions',
  'go',
  process.platform === 'win32' ? 'openspider.exe' : 'openspider',
);

function runSync(label, cmd, args, cwd = root) {
  console.log(`\n[neu:dev] ${label}…`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`[neu:dev] ${label} failed (${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function neuBin() {
  const local = path.join(root, 'node_modules', '@neutralinojs', 'neu', 'bin', 'neu.js');
  return fs.existsSync(local) ? local : null;
}

/** Neutralino on Linux/WSL needs WebKitGTK at runtime (ldd does not show it — dlopen). */
function ensureLinuxWebkit() {
  if (process.platform !== 'linux') return;
  const libs = [
    '/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so.0',
    '/lib/x86_64-linux-gnu/libwebkit2gtk-4.0.so.37',
    '/usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so.0',
    '/usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.0.so.37',
  ];
  if (libs.some((p) => fs.existsSync(p))) return;
  console.error(
    '[neu:dev] Missing libwebkit2gtk — Neutralino exits immediately on Linux/WSL.\n' +
      '  Install: sudo apt install -y libwebkit2gtk-4.1-0\n' +
      '  WSLg: ensure DISPLAY=:0 (WSLg). Without GUI, run pnpm neu:dev on Windows for window QA.',
  );
  process.exit(1);
}

function runNeu(args) {
  const bin = neuBin();
  if (bin) {
    runSync('neutralino', process.execPath, [bin, ...args], neuDir);
  } else {
    runSync('neutralino', 'npx', ['@neutralinojs/neu', ...args], neuDir);
  }
}

/** Dev-only: WebKit inspector (F12 / Ctrl+Shift+I). Restored on exit. */
function enableDevInspector() {
  const configPath = path.join(neuDir, 'neutralino.config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const previous = config.modes?.window?.enableInspector ?? false;
  config.modes ??= {};
  config.modes.window ??= {};
  config.modes.window.enableInspector = true;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  fs.writeFileSync(path.join(neuDir, 'resources', '.dev-inspector'), '1');
  return () => {
    config.modes.window.enableInspector = previous;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    try {
      fs.unlinkSync(path.join(neuDir, 'resources', '.dev-inspector'));
    } catch {
      /* ignore */
    }
  };
}

/**
 * Neutralino 6.x writes auth_info.json with nlPort/nlToken; neu CLI ≤10.x expects port/accessToken.
 * Mirror fields so DevTools WS is never ws://127.0.0.1:undefined (harmless on neu ≥11).
 */
function prepareAuthTmpDir() {
  const tmpDir = path.join(neuDir, '.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const authPath = path.join(tmpDir, 'auth_info.json');
  if (!fs.existsSync(authPath)) return;

  try {
    fs.accessSync(authPath, fs.constants.W_OK);
  } catch {
    try {
      fs.unlinkSync(authPath);
      console.warn('[neu:dev] Removed stale root-owned .tmp/auth_info.json (DevTools auth shim needs write access).');
    } catch {
      console.warn(
        '[neu:dev] .tmp/auth_info.json is not writable — DevTools may log ws://127.0.0.1:undefined.\n' +
          '  Fix: sudo rm neutralino/.tmp/auth_info.json && rerun pnpm neu:dev',
      );
    }
  }
}

function startAuthInfoCompat() {
  const authPath = path.join(neuDir, '.tmp', 'auth_info.json');
  fs.mkdirSync(path.dirname(authPath), { recursive: true });

  const normalize = () => {
    try {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      let changed = false;
      if (auth.nlPort != null && auth.port == null) {
        auth.port = auth.nlPort;
        changed = true;
      }
      if (auth.nlToken != null && auth.accessToken == null) {
        auth.accessToken = auth.nlToken;
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(authPath, `${JSON.stringify(auth)}\n`);
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'EACCES') {
        /* root-owned auth file — prepareAuthTmpDir warning already printed */
      }
      /* auth file not ready yet */
    }
  };

  normalize();
  const timer = setInterval(normalize, 250);
  return () => clearInterval(timer);
}

/** Sync Neutralino JS helpers for Vite dev (browser fallback). */
function syncNeuJsForVite() {
  const src = path.join(neuDir, 'resources', 'js');
  const dest = path.join(root, 'web', 'public', 'js');
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ['neutralino.js', 'go-extension.js', 'bootstrap.js']) {
    const from = path.join(src, name);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(dest, name));
    }
  }
}

// 1) Build Go extension + HTTP binary (headless fallback)
runSync('build Go', process.execPath, [path.join(root, 'scripts/build-go.mjs')]);
syncNeuJsForVite();

// 2) Build UI
runSync('build UI', 'pnpm', ['--dir', 'web', 'build']);

// 3) Stage extension + UI
runSync('stage extension', process.execPath, [path.join(root, 'scripts/stage-ext.mjs')]);
runSync('stage UI', process.execPath, [path.join(root, 'scripts/stage-ui.mjs')]);

// 4) Ensure Neutralino runtime + client library
const nlBinary = path.join(neuDir, 'bin', 'neutralino-linux_x64');
const nlClient = path.join(neuDir, 'resources', 'js', 'neutralino.js');
if (!fs.existsSync(nlBinary) || !fs.existsSync(nlClient)) {
  runNeu(['update']);
}

if (!fs.existsSync(extBinary)) {
  console.error(`Go extension missing after staging: ${extBinary}`);
  process.exit(1);
}

const children = [];

function shutdown(code = 0) {
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// 5) Launch native Neutralino window (spawns Go extension via config)
ensureLinuxWebkit();

if (process.env.WSL_DISTRO_NAME) {
  console.warn(
    '[neu:dev] WSL detected — native window needs WSLg + libwebkit2gtk-4.1-0. If it fails, run `pnpm neu:dev` on Windows for GUI QA.',
  );
}

console.log('\n[neu:dev] Launching Neutralino native window…');
console.log('[neu:dev] Go engine: Neutralino extension (neutralino-ext-go / extGo)');
console.log('[neu:dev] DevTools: F12 or Ctrl+Shift+I (enableInspector on in dev)');
console.log('[neu:dev] Close the window or Ctrl+C here to stop.\n');

const restoreDevConfig = enableDevInspector();
prepareAuthTmpDir();
const stopAuthCompat = startAuthInfoCompat();
process.on('exit', () => {
  restoreDevConfig();
  stopAuthCompat();
});

const neuEnv = { ...process.env, NODE_ENV: 'development' };
if (process.platform === 'linux') {
  neuEnv.WEBKIT_DISABLE_DMABUF_RENDERER ??= '1';
  neuEnv.WEBKIT_DISABLE_COMPOSITING_MODE ??= '1';
  if (process.env.WSL_DISTRO_NAME) {
    neuEnv.LIBGL_ALWAYS_SOFTWARE ??= '1';
  }
}

const bin = neuBin();
const neuArgs = ['run', '--disable-auto-reload'];
const neuChild = bin
  ? spawn(process.execPath, [bin, ...neuArgs], { cwd: neuDir, stdio: 'inherit', shell: false, env: neuEnv })
  : spawn('npx', ['@neutralinojs/neu', ...neuArgs], { cwd: neuDir, stdio: 'inherit', shell: false, env: neuEnv });
children.push(neuChild);

neuChild.on('exit', (code) => {
  restoreDevConfig();
  stopAuthCompat();
  const exitCode = code ?? 0;
  console.log(`\n[neu:dev] Neutralino exited (${exitCode})`);
  if (exitCode !== 0 && process.env.WSL_DISTRO_NAME) {
    console.warn('[neu:dev] WSL GUI unavailable — use Windows native for window QA; HTTP smoke: pnpm dev:go');
  }
  shutdown(exitCode);
});
