#!/usr/bin/env node
/**
 * Set product version from a git tag before release build.
 * CI: GITHUB_REF_NAME=v1.2.3  Local: node scripts/sync-version-from-tag.mjs v1.2.3
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const raw = process.env.GITHUB_REF_NAME ?? process.argv[2];
if (!raw) {
  console.error('Provide a tag: GITHUB_REF_NAME or argv[2] (e.g. v1.2.3)');
  process.exit(1);
}

const version = raw.replace(/^v/i, '');
if (!/^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/.test(version)) {
  console.error(`Invalid semver after stripping "v": ${version}`);
  process.exit(1);
}

function writeJson(rel, mutate) {
  const filePath = path.join(root, rel);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  mutate(data);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

writeJson('package.json', (pkg) => {
  pkg.version = version;
});
writeJson('web/package.json', (pkg) => {
  pkg.version = version;
});
writeJson('neutralino/neutralino.config.json', (cfg) => {
  cfg.version = version;
  cfg.modes ??= {};
  cfg.modes.window ??= {};
  cfg.modes.window.enableInspector = false;
});

const vitePath = path.join(root, 'web/vite.config.ts');
let vite = readFileSync(vitePath, 'utf8');
vite = vite.replace(
  /__APP_VERSION__:\s*JSON\.stringify\('[^']*'\)/,
  `__APP_VERSION__: JSON.stringify('${version}')`,
);
writeFileSync(vitePath, vite);

for (const rel of [
  'go/internal/api/server.go',
  'go/internal/neutralinoext/neutralino-extension.go',
]) {
  const filePath = path.join(root, rel);
  let src = readFileSync(filePath, 'utf8');
  src = src.replace(/const Version = "[^"]+"/, `const Version = "${version}"`);
  writeFileSync(filePath, src);
}

console.log(`Release version set to ${version} (inspector off in neu config)`);
