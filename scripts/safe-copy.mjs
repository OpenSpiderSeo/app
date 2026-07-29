/** Atomic file replace resilient to ETXTBSY/EBUSY on executing binaries (Linux). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BUSY_CODES = new Set(['ETXTBSY', 'EBUSY', 'EPERM']);

function sleepMs(ms) {
  if (ms <= 0) return;
  spawnSync('sleep', [String(Math.max(0.05, ms / 1000))], { stdio: 'ignore' });
}

function sameInode(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.dev === sb.dev && sa.ino === sb.ino;
  } catch {
    return false;
  }
}

function filesEqual(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.size === sb.size && sa.mtimeMs === sb.mtimeMs;
  } catch {
    return false;
  }
}

/**
 * Copy src → dest via temp + rename (safe while dest is executing).
 * Skips when src/dest are the same inode or already identical.
 */
export function safeReplaceFileSync(src, dest, { retries = 8, delayMs = 250 } = {}) {
  if (sameInode(src, dest)) {
    console.log(`Skip replace: ${dest} (same inode as ${src})`);
    return 'skipped-same-inode';
  }
  if (fs.existsSync(dest) && filesEqual(src, dest)) {
    console.log(`Skip replace: ${dest} (already up to date)`);
    return 'skipped-unchanged';
  }

  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(dest)}.${process.pid}.${Date.now()}.tmp`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.copyFileSync(src, tmp);
      fs.renameSync(tmp, dest);
      return 'replaced';
    } catch (err) {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }

      const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
      if (BUSY_CODES.has(code) && attempt < retries) {
        console.warn(`${code} replacing ${dest}, retry ${attempt}/${retries}…`);
        sleepMs(delayMs * attempt);
        continue;
      }

      if (BUSY_CODES.has(code) && fs.existsSync(dest) && filesEqual(src, dest)) {
        console.warn(`${code} replacing ${dest} — dest busy but unchanged, skipping`);
        return 'skipped-busy-unchanged';
      }

      throw err;
    }
  }

  throw new Error(`Failed to replace ${dest} after ${retries} attempts`);
}
