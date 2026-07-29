#!/usr/bin/env node
/**
 * Slim Neutralino release ZIP: neu bundles ALL platform binaries — ship only the target.
 * Usage: GOOS=linux GOARCH=amd64 node scripts/package-release.mjs <artifact-name>
 * Output: dist/release/<artifact-name>.zip
 */
import { createRequire } from 'node:module';
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
  console.error('Usage: node scripts/package-release.mjs <artifact-name>');
  process.exit(1);
}

const goos = process.env.GOOS ?? (process.platform === 'win32' ? 'windows' : process.platform);
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

const key = `${goos === 'windows' ? 'windows' : goos}:${goarch}`;
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

for (const p of [neuBinPath, resourcesNeu]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing required file: ${p}`);
    console.error('Run neu build --release first.');
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

console.log(`Packaged ${outZip}`);
for (const name of fs.readdirSync(path.dirname(outZip))) {
  if (name === `${artifact}.zip`) {
    const entries = ['  ' + neuBinary, '  resources.neu', '  extensions/'];
    console.log('Contents:');
    for (const e of entries) console.log(e);
  }
}
