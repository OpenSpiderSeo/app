#!/usr/bin/env node
/** Dev: Go engine + Vite UI in parallel. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, cwd, label) {
  const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: false });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with ${code}`);
      process.exit(code);
    }
  });
  return child;
}

const goBin = path.join(root, 'go', 'bin', process.platform === 'win32' ? 'openspider.exe' : 'openspider');
const goChild = run(goBin, ['-addr', ':7845'], path.join(root, 'go'), 'go');
const uiChild = run('pnpm', ['--dir', 'web', 'dev'], root, 'ui');

function shutdown() {
  goChild.kill('SIGTERM');
  uiChild.kill('SIGTERM');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('OpenSpider dev — Go :7845 + Vite :5173');
console.log('Open http://localhost:5173');
