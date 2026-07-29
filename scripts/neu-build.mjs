#!/usr/bin/env node
/** Release build: Go + Vite UI + Neutralino bundle. Packaged builds never enable DevTools. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const neuDir = path.join(root, 'neutralino');

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Packaged product must not ship WebKit inspector (F12). Dev toggles it only in neu-dev.mjs. */
function ensureInspectorOff() {
  const cfgPath = path.join(neuDir, 'neutralino.config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.modes ??= {};
  cfg.modes.window ??= {};
  cfg.modes.window.enableInspector = false;
  fs.writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
  const flag = path.join(neuDir, 'resources', '.dev-inspector');
  if (fs.existsSync(flag)) fs.unlinkSync(flag);
}

ensureInspectorOff();
run(process.execPath, [path.join(root, 'scripts/build-go.mjs')], root);
run('pnpm', ['--dir', 'web', 'build'], root);
run(process.execPath, [path.join(root, 'scripts/stage-ext.mjs')], root);
run(process.execPath, [path.join(root, 'scripts/stage-ui.mjs')], root);

const neuBin = path.join(root, 'node_modules', '@neutralinojs', 'neu', 'bin', 'neu.js');
if (fs.existsSync(neuBin)) {
  run(process.execPath, [neuBin, 'build', '--release'], neuDir);
} else {
  run('npx', ['@neutralinojs/neu', 'build', '--release'], neuDir);
}

console.log('Neutralino build complete — see neutralino/dist/');
