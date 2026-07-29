#!/usr/bin/env node
/** Copy Go Neutralino extension binary into neutralino/extensions/go/ */
import fs from 'node:fs';
import path from 'node:path';
import { neuDir } from './paths.mjs';
import { goBinaryFileName, stageBinaryFromGoBin } from './stage-go-binary.mjs';

const destDir = path.join(neuDir, 'extensions', 'go');
fs.mkdirSync(destDir, { recursive: true });

const dest = path.join(destDir, goBinaryFileName('openspider'));
stageBinaryFromGoBin('openspider-ext', dest, {
  missingHint: 'Missing Go extension binary — run pnpm build:go first',
});
console.log(`Staged Go extension → ${dest}`);

/** Optional: keep HTTP sidecar in resources/bin for headless smoke / browser dev */
const binDestDir = path.join(neuDir, 'resources', 'bin');
fs.mkdirSync(binDestDir, { recursive: true });
const sidecarDest = path.join(binDestDir, goBinaryFileName('openspider'));
stageBinaryFromGoBin('openspider', sidecarDest);
console.log(`Staged HTTP sidecar (dev fallback) → ${sidecarDest}`);
