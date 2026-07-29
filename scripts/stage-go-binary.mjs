/** Stage a Go binary from go/bin into Neutralino resources or extensions. */
import fs from 'node:fs';
import path from 'node:path';
import { safeReplaceFileSync } from './safe-copy.mjs';
import { goBinDir } from './paths.mjs';

export function goBinaryExt() {
  return process.platform === 'win32' ? '.exe' : '';
}

export function goBinaryFileName(base = 'openspider') {
  return process.platform === 'win32' ? `${base}.exe` : base;
}

/**
 * @param {string} srcBaseName - e.g. "openspider" or "openspider-ext"
 * @param {string} destPath - full destination path
 * @param {{ missingHint?: string }} [opts]
 */
export function stageBinaryFromGoBin(srcBaseName, destPath, opts = {}) {
  const ext = goBinaryExt();
  const src = path.join(goBinDir, `${srcBaseName}${ext}`);
  if (!fs.existsSync(src)) {
    console.error(opts.missingHint ?? `Missing Go binary: ${src} — run pnpm build:go first`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  safeReplaceFileSync(src, destPath);
  if (process.platform !== 'win32') {
    fs.chmodSync(destPath, 0o755);
  }
  return destPath;
}
