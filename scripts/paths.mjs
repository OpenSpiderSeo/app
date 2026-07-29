/** Shared repo path constants for build/stage scripts. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const goBinDir = path.join(root, 'go', 'bin');
export const neuDir = path.join(root, 'neutralino');
