#!/usr/bin/env node
/**
 * Ensure Neutralino host binaries exist under neutralino/bin/.
 * Prefer `neu update`; on corrupt/incomplete downloads, fetch the official zip via curl.
 *
 * Usage: GOOS=… GOARCH=… node scripts/ensure-neutralino-binaries.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const neuDir = path.join(root, 'neutralino');
const binDir = path.join(neuDir, 'bin');
const cfg = JSON.parse(fs.readFileSync(path.join(neuDir, 'neutralino.config.json'), 'utf8'));
const version = cfg?.cli?.binaryVersion;
if (!version) {
  console.error('neutralino.config.json missing cli.binaryVersion');
  process.exit(1);
}

const goosRaw = process.env.GOOS ?? process.platform;
const goos =
  goosRaw === 'win32' || goosRaw === 'windows'
    ? 'windows'
    : goosRaw === 'darwin'
      ? 'darwin'
      : 'linux';
const goarch = process.env.GOARCH ?? 'amd64';

const requiredByTarget = {
  'linux:amd64': 'neutralino-linux_x64',
  'linux:arm64': 'neutralino-linux_arm64',
  'darwin:amd64': 'neutralino-mac_x64',
  'darwin:arm64': 'neutralino-mac_arm64',
  'windows:amd64': 'neutralino-win_x64.exe',
};

const key = `${goos}:${goarch}`;
const required = requiredByTarget[key];
if (!required) {
  console.error(`No Neutralino binary mapping for ${key}`);
  process.exit(1);
}

function hasRequired() {
  const p = path.join(binDir, required);
  if (!fs.existsSync(p)) return false;
  const st = fs.statSync(p);
  return st.isFile() && st.size > 100_000;
}

function runNeuUpdate() {
  const neuJs = path.join(root, 'node_modules', '@neutralinojs', 'neu', 'bin', 'neu.js');
  const args = fs.existsSync(neuJs)
    ? [neuJs, 'update']
    : ['--yes', '@neutralinojs/neu', 'update'];
  const cmd = fs.existsSync(neuJs) ? process.execPath : 'npx';
  console.log(`Running: ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: neuDir, stdio: 'inherit', shell: false });
  return r.status === 0;
}

function downloadZipFallback() {
  const url = `https://github.com/neutralinojs/neutralinojs/releases/download/v${version}/neutralinojs-v${version}.zip`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-bin-'));
  const zipPath = path.join(tmp, 'neutralinojs.zip');
  console.log(`Fallback download: ${url}`);
  execFileSync('curl', ['-fsSL', '--retry', '5', '--retry-delay', '2', '-o', zipPath, url], {
    stdio: 'inherit',
  });
  const st = fs.statSync(zipPath);
  if (st.size < 1_000_000) {
    throw new Error(`Downloaded zip too small (${st.size} bytes) — likely corrupt`);
  }
  fs.mkdirSync(binDir, { recursive: true });
  // Clear previous partial binaries
  for (const name of fs.readdirSync(binDir)) {
    if (name.startsWith('neutralino-')) fs.rmSync(path.join(binDir, name), { force: true });
  }
  execFileSync('unzip', ['-o', zipPath, '-d', binDir], { stdio: 'inherit' });
  // Zip may nest files; flatten one level if needed
  for (const name of fs.readdirSync(binDir)) {
    const p = path.join(binDir, name);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const inner of fs.readdirSync(p)) {
      if (inner.startsWith('neutralino-')) {
        fs.renameSync(path.join(p, inner), path.join(binDir, inner));
      }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (hasRequired()) {
  console.log(`OK: ${required} already present`);
  process.exit(0);
}

let ok = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`neu update attempt ${attempt}/3…`);
  fs.rmSync(path.join(neuDir, '.tmp'), { recursive: true, force: true });
  if (runNeuUpdate() && hasRequired()) {
    ok = true;
    break;
  }
  console.warn(`neu update attempt ${attempt} did not produce ${required}`);
}

if (!ok) {
  console.warn('neu update failed — using GitHub zip fallback');
  downloadZipFallback();
}

if (!hasRequired()) {
  console.error(`Still missing ${path.join(binDir, required)}`);
  console.error('bin/ contents:', fs.existsSync(binDir) ? fs.readdirSync(binDir).join(', ') : '(none)');
  process.exit(1);
}

console.log(`OK: ensured ${required}`);
process.exit(0);
