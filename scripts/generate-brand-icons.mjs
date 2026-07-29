#!/usr/bin/env node
/**
 * Regenerate Windows/macOS/Linux branding rasters from assets/branding/spider-mark.svg.
 * Requires ImageMagick (`convert`) only when outputs are missing or invalid.
 * Committed icon.png / icon.ico are used as-is on CI (e.g. Windows without ImageMagick).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const branding = path.join(root, 'assets', 'branding');
const svg = path.join(branding, 'spider-mark.svg');
const png = path.join(branding, 'icon.png');
const ico = path.join(branding, 'icon.ico');

function isValidPng(filePath) {
  if (!existsSync(filePath)) return false;
  if (statSync(filePath).size < 8) return false;
  const head = readFileSync(filePath);
  return (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  );
}

/** ICO (classic) or PNG embedded in .ico */
function isValidIco(filePath) {
  if (!existsSync(filePath)) return false;
  if (statSync(filePath).size < 6) return false;
  const head = readFileSync(filePath);
  const classic =
    head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0;
  const pngEmbedded =
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47;
  return classic || pngEmbedded;
}

const forceRegenerate =
  process.env.FORCE_REGENERATE_ICONS === '1' ||
  process.env.FORCE_REGENERATE_ICONS === 'true';

if (!forceRegenerate && isValidPng(png) && isValidIco(ico)) {
  console.log(
    `Skipping icon generation: ${path.relative(root, png)} and ${path.relative(root, ico)} already present (use FORCE_REGENERATE_ICONS=1 to regenerate).`,
  );
  process.exit(0);
}

if (!existsSync(svg)) {
  console.error(`Missing source SVG: ${svg}`);
  process.exit(1);
}

try {
  execFileSync('convert', ['-version'], { stdio: 'ignore' });
} catch {
  console.error(
    'ImageMagick `convert` is required to generate icons (missing or invalid icon.png/icon.ico).',
  );
  process.exit(1);
}

console.log('Generating icon.png…');
execFileSync(
  'convert',
  ['-background', 'none', '-density', '512', svg, '-resize', '512x512', png],
  { stdio: 'inherit' },
);

console.log('Generating icon.ico…');
execFileSync(
  'convert',
  [png, '-define', 'icon:auto-resize=256,128,64,48,32,16', ico],
  { stdio: 'inherit' },
);

console.log(`Done: ${path.relative(root, png)}, ${path.relative(root, ico)}`);
