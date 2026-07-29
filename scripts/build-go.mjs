#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeReplaceFileSync } from './safe-copy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const goDir = path.join(root, 'go');
const outDir = path.join(goDir, 'bin');
fs.mkdirSync(outDir, { recursive: true });

const goos = process.env.GOOS ?? (process.platform === 'win32' ? 'windows' : process.platform);
const goarch = process.env.GOARCH ?? 'amd64';
const ext = goos === 'windows' ? '.exe' : '';

function build(target, outName) {
  const out = path.join(outDir, `${outName}-${goos}-${goarch}${ext}`);
  const buildTmp = path.join(outDir, `.build-${outName}-${process.pid}${ext}`);
  console.log(`Building Go ${target} → ${out}`);
  const r = spawnSync('go', ['build', '-o', buildTmp, target], {
    cwd: goDir,
    stdio: 'inherit',
    env: { ...process.env, GOOS: goos, GOARCH: goarch },
  });
  if (r.status !== 0) {
    try {
      fs.unlinkSync(buildTmp);
    } catch {
      /* ignore */
    }
    process.exit(r.status ?? 1);
  }
  safeReplaceFileSync(buildTmp, out);
  try {
    fs.unlinkSync(buildTmp);
  } catch {
    /* renamed away */
  }
  const defaultOut = path.join(outDir, `${outName}${ext}`);
  safeReplaceFileSync(out, defaultOut);
  console.log(`Dev binary: ${defaultOut}`);
  return defaultOut;
}

build('./cmd/openspider/', 'openspider');
build('./cmd/openspider-ext/', 'openspider-ext');
