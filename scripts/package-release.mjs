#!/usr/bin/env node
/**
 * Slim Neutralino release ZIP: neu bundles ALL platform binaries — ship only the target.
 * Usage: GOOS=linux GOARCH=amd64 node scripts/package-release.mjs <artifact-name>
 * Output: dist/release/<artifact-name>.zip
 *
 * Guarantees: exactly one Neutralino host binary + extensions/ + resources.neu.
 * Never packs linux+mac+win together.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let archiver;
try {
  archiver = require('archiver');
} catch {
  archiver = require(path.join(root, 'node_modules', '@neutralinojs', 'neu', 'node_modules', 'archiver'));
}

const artifact = process.argv[2];
if (!artifact) {
  console.error('Usage: GOOS=… GOARCH=… node scripts/package-release.mjs <artifact-name>');
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

/** Map GOOS/GOARCH → Neutralino binary filename (after binaryName rename). */
const neuBinaryByTarget = {
  'linux:amd64': 'openspider-linux_x64',
  'linux:arm64': 'openspider-linux_arm64',
  'linux:armhf': 'openspider-linux_armhf',
  'darwin:amd64': 'openspider-mac_x64',
  'darwin:arm64': 'openspider-mac_arm64',
  'windows:amd64': 'openspider-win_x64.exe',
};

const ALL_NEU_BINARIES = new Set(Object.values(neuBinaryByTarget));

const key = `${goos}:${goarch}`;
const neuBinary = neuBinaryByTarget[key];
if (!neuBinary) {
  console.error(`No Neutralino binary mapping for ${key}`);
  process.exit(1);
}

const bundleDir = path.join(root, 'neutralino', 'dist', 'openspider');
const outDir = path.join(root, 'dist', 'release');
const outZip = path.join(outDir, `${artifact}.zip`);
const staging = path.join(root, 'dist', '.pack-staging', artifact);

const neuBinPath = path.join(bundleDir, neuBinary);
const resourcesNeu = path.join(bundleDir, 'resources.neu');
const extensionsDir = path.join(bundleDir, 'extensions');

if (!fs.existsSync(bundleDir)) {
  console.error(`Missing bundle dir: ${bundleDir} — run neu build --release first.`);
  process.exit(1);
}

/** Drop foreign Neutralino host binaries left by `neu build` (packs all OS by default). */
function pruneForeignNeuBinaries() {
  for (const name of fs.readdirSync(bundleDir)) {
    if (!ALL_NEU_BINARIES.has(name)) continue;
    if (name === neuBinary) continue;
    fs.rmSync(path.join(bundleDir, name), { force: true });
    console.log(`Pruned foreign Neutralino binary: ${name}`);
  }
}

pruneForeignNeuBinaries();

for (const p of [neuBinPath, resourcesNeu]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing required file: ${p}`);
    console.error(`Expected target binary for ${key}: ${neuBinary}`);
    console.error('Contents of bundle dir:', fs.readdirSync(bundleDir).join(', '));
    process.exit(1);
  }
}

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
fs.copyFileSync(neuBinPath, path.join(staging, neuBinary));
fs.copyFileSync(resourcesNeu, path.join(staging, 'resources.neu'));
if (fs.existsSync(extensionsDir)) {
  fs.cpSync(extensionsDir, path.join(staging, 'extensions'), { recursive: true });
} else {
  fs.mkdirSync(path.join(staging, 'extensions'), { recursive: true });
}

const stagedHosts = fs.readdirSync(staging).filter((n) => ALL_NEU_BINARIES.has(n));
if (stagedHosts.length !== 1 || stagedHosts[0] !== neuBinary) {
  console.error(`Staging host binaries invalid: ${stagedHosts.join(', ') || '(none)'}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.rmSync(outZip);

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(outZip);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(staging, false);
  archive.finalize();
});

fs.rmSync(staging, { recursive: true, force: true });

function listZipEntries(zipPath) {
  try {
    const out = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return null;
  }
}

const entries = listZipEntries(outZip);
if (entries) {
  const hosts = entries.filter((e) => ALL_NEU_BINARIES.has(path.posix.basename(e)));
  if (hosts.length !== 1) {
    console.error(`ZIP must contain exactly 1 Neutralino binary, found ${hosts.length}:`);
    for (const h of hosts) console.error(`  ${h}`);
    process.exit(1);
  }
  console.log(`Packaged ${outZip} (single platform: ${hosts[0]})`);
  console.log('Contents:');
  for (const e of entries) console.log(`  ${e}`);
} else {
  console.log(`Packaged ${outZip}`);
  console.log(`  ${neuBinary}`);
  console.log('  resources.neu');
  console.log('  extensions/');
}
