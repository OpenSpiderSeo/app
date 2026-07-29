#!/usr/bin/env node
/** Copy Go sidecar into Neutralino resources/bin for dev and release. */
import path from 'node:path';
import { neuDir } from './paths.mjs';
import { goBinaryFileName, stageBinaryFromGoBin } from './stage-go-binary.mjs';

const destDir = path.join(neuDir, 'resources', 'bin');
const dest = path.join(destDir, goBinaryFileName('openspider'));

stageBinaryFromGoBin('openspider', dest, {
  missingHint: `Missing Go sidecar: run pnpm build:go first`,
});
console.log(`Staged sidecar → ${dest}`);
