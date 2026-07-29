#!/usr/bin/env node
/**
 * Copy Vite build into Neutralino resources/ (documentRoot /resources/).
 * neu bundles only cli.resourcesPath — web/dist outside resources never ships (404 in release).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'web', 'dist');
const dest = path.join(root, 'neutralino', 'resources');
const jsSrc = path.join(root, 'neutralino', 'resources', 'js');

if (!fs.existsSync(src)) {
  console.error(`Missing UI build: ${src} — run pnpm build:ui first`);
  process.exit(1);
}

const indexSrc = path.join(src, 'index.html');
const assetsSrc = path.join(src, 'assets');
if (!fs.existsSync(indexSrc)) {
  console.error(`Missing index.html in ${src}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });

/** Drop legacy Next.js output if a previous stage left it (WebKit may cache /_next/static). */
const legacyNext = path.join(dest, '_next');
if (fs.existsSync(legacyNext)) {
  fs.rmSync(legacyNext, { recursive: true, force: true });
  console.log('Removed legacy neutralino/resources/_next');
}

/** Neutralino WebKitGTK rejects module/CSS tags with crossorigin (no ACAO headers). */
function patchIndexHtmlForNeutralino(html) {
  let out = html
    .replace(/\s+crossorigin(="[^"]*")?/g, '')
    .replace(/src="\/js\//g, 'src="./js/')
    .replace(/href="\/js\//g, 'href="./js/');

  const nlScripts = [
    '<script src="./js/neutralino.js"></script>',
    '<script src="./js/go-extension.js"></script>',
    '<script src="./js/bootstrap.js"></script>',
  ].join('\n    ');

  // Vite puts the module bundle in <head>; it must run after GoExtension is defined.
  out = out.replace(/<script src="\.\/js\/neutralino\.js"><\/script>\s*/g, '');
  out = out.replace(/<script src="\.\/js\/go-extension\.js"><\/script>\s*/g, '');
  out = out.replace(/<script src="\.\/js\/bootstrap\.js"><\/script>\s*/g, '');

  if (out.includes('<script type="module"')) {
    out = out.replace('<script type="module"', `${nlScripts}\n    <script type="module"`);
  } else {
    out = out.replace('</body>', `    ${nlScripts}\n  </body>`);
  }

  return out;
}

const indexHtml = patchIndexHtmlForNeutralino(fs.readFileSync(indexSrc, 'utf8'));
fs.writeFileSync(path.join(dest, 'index.html'), indexHtml);

if (fs.existsSync(assetsSrc)) {
  const assetsDest = path.join(dest, 'assets');
  fs.rmSync(assetsDest, { recursive: true, force: true });
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });
}

/** Keep Neutralino client scripts (neutralino.js, go-extension.js, bootstrap.js). */
const jsDest = path.join(dest, 'js');
fs.mkdirSync(jsDest, { recursive: true });
for (const name of ['neutralino.js', 'neutralino.d.ts', 'go-extension.js', 'bootstrap.js']) {
  const from = path.join(jsSrc, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(jsDest, name));
  }
}

console.log(`Staged UI → ${dest} (index.html + assets/ + js/)`);
