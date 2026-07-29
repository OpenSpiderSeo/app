#!/usr/bin/env node
/**
 * Fail CI if packaged resources.neu is missing OpenSpider UI (or still Neutralino sample).
 * Usage: node scripts/verify-resources-neu.mjs [path/to/resources.neu]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const neuPath =
  process.argv[2] ?? path.join(root, 'neutralino', 'dist', 'openspider', 'resources.neu');

if (!fs.existsSync(neuPath)) {
  console.error(`Missing ${neuPath}`);
  process.exit(1);
}

const asarBin = path.join(root, 'node_modules', '.bin', 'asar');
if (!fs.existsSync(asarBin)) {
  console.error('Missing node_modules/.bin/asar');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'os-neu-verify-'));
const out = path.join(tmp, 'out');
const r = spawnSync(asarBin, ['extract', neuPath, out], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout || 'asar extract failed');
  process.exit(1);
}

const indexPath = path.join(out, 'resources', 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('resources.neu has no resources/index.html');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('<title>OpenSpider</title>') || !html.includes('id="root"')) {
  console.error('resources.neu index.html is not OpenSpider UI');
  console.error(html.slice(0, 400));
  process.exit(1);
}
if (/Neutralinojs sample app|id="neutralinoapp"/i.test(html)) {
  console.error('resources.neu still contains Neutralino sample template');
  process.exit(1);
}
if (/type=["']module["']/.test(html)) {
  console.error('resources.neu index still uses type=module (packaged WebView may show blank UI)');
  process.exit(1);
}

const assetsDir = path.join(out, 'resources', 'assets');
const js = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
  : [];
if (js.length < 1) {
  console.error('resources.neu has no JS assets');
  process.exit(1);
}

const jsPath = path.join(assetsDir, js[0]);
const jsHead = fs.readFileSync(jsPath, 'utf8').slice(0, 2000);
if (!/OpenSpider|createRoot|openspider/i.test(jsHead + fs.readFileSync(jsPath, 'utf8').slice(0, 50_000))) {
  // soft check — minified may rename; require non-trivial size instead
  if (fs.statSync(jsPath).size < 50_000) {
    console.error(`App bundle too small (${fs.statSync(jsPath).size} bytes): ${js[0]}`);
    process.exit(1);
  }
}

console.log(`OK: ${neuPath}`);
console.log(`  index: OpenSpider, no type=module`);
console.log(`  assets js: ${js.join(', ')}`);

fs.rmSync(tmp, { recursive: true, force: true });
