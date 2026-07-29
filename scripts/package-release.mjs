#!/usr/bin/env node
/**
 * Slim Neutralino release package: neu bundles ALL platform binaries — ship only the target.
 * Usage: GOOS=linux GOARCH=amd64 node scripts/package-release.mjs <artifact-name>
 *
 * Output:
 *   dist/release/<artifact-name>.zip
 *   Windows also: dist/release/OpenSpider-windows-x64.exe  (self-extracting portable)
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

/** If neu build skipped copy (empty bin/), salvage from neutralino/bin/. */
if (!fs.existsSync(neuBinPath)) {
  const rawName = neuBinary.replace(/^openspider/, 'neutralino');
  const src = path.join(root, 'neutralino', 'bin', rawName);
  if (fs.existsSync(src) && fs.statSync(src).size > 100_000) {
    console.warn(`Host missing in dist — copying from bin/${rawName}`);
    fs.copyFileSync(src, neuBinPath);
    try {
      fs.chmodSync(neuBinPath, 0o755);
    } catch {
      /* windows */
    }
  }
}

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

/** Windows: ship as OpenSpider.exe so Explorer / Start Menu label is clear. */
const stagedHostName = goos === 'windows' ? 'OpenSpider.exe' : neuBinary;
fs.copyFileSync(neuBinPath, path.join(staging, stagedHostName));
fs.copyFileSync(resourcesNeu, path.join(staging, 'resources.neu'));
if (fs.existsSync(extensionsDir)) {
  fs.cpSync(extensionsDir, path.join(staging, 'extensions'), { recursive: true });
} else {
  fs.mkdirSync(path.join(staging, 'extensions'), { recursive: true });
}

fs.writeFileSync(
  path.join(staging, 'README.txt'),
  [
    'OpenSpider — extract ALL files into one folder, then run:',
    '',
    `  ${stagedHostName}`,
    '',
    'Keep resources.neu and extensions/ next to the executable.',
    'Do NOT run the .exe from inside a ZIP preview — that shows the blank Neutralino window.',
    '',
    'Preferred on Windows: download OpenSpider-windows-x64.exe (self-extracting) from the GitHub Release.',
    '',
  ].join('\n'),
);

const stagedHosts = fs
  .readdirSync(staging)
  .filter((n) => ALL_NEU_BINARIES.has(n) || n === 'OpenSpider.exe');
if (stagedHosts.length !== 1) {
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
  const hosts = entries.filter(
    (e) => ALL_NEU_BINARIES.has(path.posix.basename(e)) || path.posix.basename(e) === 'OpenSpider.exe',
  );
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
  console.log(`  ${stagedHostName}`);
  console.log('  resources.neu');
  console.log('  extensions/');
}

/** Windows portable SFX: one .exe download that always extracts host+resources+extensions. */
if (goos === 'windows') {
  const version =
    process.env.GITHUB_REF_NAME?.replace(/^v/, '') ||
    JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version ||
    'dev';
  const portableDir = path.join(root, 'go', 'cmd', 'winportable');
  const payloadPath = path.join(portableDir, 'payload.zip');
  fs.copyFileSync(outZip, payloadPath);

  const outExe = path.join(outDir, 'OpenSpider-windows-x64.exe');
  if (fs.existsSync(outExe)) fs.rmSync(outExe);

  const ldflags = `-H windowsgui -X main.version=${version}`;
  execFileSync(
    'go',
    ['build', '-ldflags', ldflags, '-o', outExe, './cmd/winportable'],
    {
      cwd: path.join(root, 'go'),
      env: {
        ...process.env,
        GOOS: 'windows',
        GOARCH: goarch === 'amd64' ? 'amd64' : goarch,
        CGO_ENABLED: '0',
      },
      stdio: 'inherit',
    },
  );

  // Restore tiny placeholder so tree stays small for local commits.
  const placeholder = path.join(portableDir, 'payload.placeholder.zip');
  if (fs.existsSync(placeholder)) {
    fs.copyFileSync(placeholder, payloadPath);
  }

  const st = fs.statSync(outExe);
  if (st.size < 1_000_000) {
    console.error(`Portable exe too small (${st.size}) — payload embed failed`);
    process.exit(1);
  }
  console.log(`Portable Windows EXE: ${outExe} (${st.size} bytes)`);
}

fs.rmSync(staging, { recursive: true, force: true });
