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

/**
 * Patch Vite index for Neutralino documentRoot=/resources/:
 * - absolute /js and /assets paths (stable in asar)
 * - classic <script> (IIFE build) — no type=module
 * - Neutralino + GoExtension scripts before the app bundle
 */
function patchIndexHtmlForNeutralino(html) {
  let out = html.replace(/\s+crossorigin(="[^"]*")?/g, '');

  out = out
    .replace(/(src|href)="\.\/(assets|js)\//g, '$1="/$2/')
    .replace(/<script type="module"\s+/g, '<script ')
    .replace(/<script type="module"/g, '<script');

  const nlScripts = [
    '<script src="/js/neutralino.js"></script>',
    '<script src="/js/go-extension.js"></script>',
    '<script src="/js/bootstrap.js"></script>',
  ].join('\n    ');

  for (const name of ['neutralino.js', 'go-extension.js', 'bootstrap.js']) {
    out = out.replace(new RegExp(`\\s*<script src="/(?:\\./)?js/${name}"><\\/script>`, 'g'), '');
  }

  // Prefer injecting NL scripts right before the Vite app bundle.
  if (/<script[^>]*src="\/assets\/[^"]+\.js"/i.test(out)) {
    out = out.replace(
      /(<script[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>)/i,
      `${nlScripts}\n    $1`,
    );
  } else {
    out = out.replace('</body>', `    ${nlScripts}\n  </body>`);
  }

  // App bundle should defer so Neutralino/GoExtension globals exist first.
  out = out.replace(
    /<script(\s+)src="(\/assets\/[^"]+\.js)"/i,
    '<script$1defer src="$2"',
  );

  if (!out.includes('OpenSpider')) {
    console.error('Patched index.html missing OpenSpider title — refusing to stage');
    process.exit(1);
  }
  if (/Neutralinojs sample app|id="neutralinoapp"/i.test(out)) {
    console.error('Refusing to stage Neutralino sample template');
    process.exit(1);
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

const jsFiles = fs.readdirSync(path.join(src, 'assets')).filter((f) => f.endsWith('.js'));
if (jsFiles.length < 1) {
  console.error('No JS assets in web/dist/assets — UI build incomplete');
  process.exit(1);
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

console.log(`Staged UI → ${dest} (index.html + assets/ + js/), app bundles: ${jsFiles.join(', ')}`);
