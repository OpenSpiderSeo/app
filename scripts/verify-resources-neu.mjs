#!/usr/bin/env node
/**
 * Fail CI if packaged resources.neu is missing OpenSpider UI (or still Neutralino sample).
 * Uses asar Node API (Windows-safe — no .bin/asar shell shim).
 * Usage: node scripts/verify-resources-neu.mjs [path/to/resources.neu]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const neuPath = path.resolve(
  process.argv[2] ?? path.join(root, 'neutralino', 'dist', 'openspider', 'resources.neu'),
);

if (!fs.existsSync(neuPath)) {
  console.error(`Missing ${neuPath}`);
  process.exit(1);
}

function loadAsar() {
  const require = createRequire(import.meta.url);
  try {
    return require('asar');
  } catch {
    /* fall through */
  }
  try {
    const neuReq = createRequire(
      pathToFileURL(path.join(root, 'node_modules', '@neutralinojs', 'neu', 'package.json')).href,
    );
    return neuReq('asar');
  } catch (e) {
    console.error('Unable to load asar module:', e.message);
    process.exit(1);
  }
}

const asar = loadAsar();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'os-neu-verify-'));
const out = path.join(tmp, 'out');
fs.mkdirSync(out, { recursive: true });

try {
  asar.extractAll(neuPath, out);
} catch (e) {
  console.error('asar extract failed:', e.message || e);
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
if (fs.statSync(jsPath).size < 50_000) {
  console.error(`App bundle too small (${fs.statSync(jsPath).size} bytes): ${js[0]}`);
  process.exit(1);
}

console.log(`OK: ${neuPath}`);
console.log(`  index: OpenSpider, no type=module`);
console.log(`  assets js: ${js.join(', ')}`);

fs.rmSync(tmp, { recursive: true, force: true });
