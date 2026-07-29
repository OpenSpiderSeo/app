#!/usr/bin/env node
/** Print Keep-a-Changelog section for a version → stdout (release body). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/extract-changelog.mjs <version>');
  process.exit(1);
}

const changelog = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md'),
  'utf8',
);

const header = `## [${version}]`;
const start = changelog.indexOf(header);
if (start === -1) {
  console.error(`Section ${header} not found in CHANGELOG.md`);
  process.exit(1);
}

const rest = changelog.slice(start + header.length);
const next = rest.search(/\n## \[/);
const section = (next === -1 ? rest : rest.slice(0, next)).trim();
// Drop leading date line (— YYYY-MM-DD)
const body = section.replace(/^—[^\n]*\n?/, '').trim();

console.log(`# OpenSpider v${version}\n`);
console.log(body);
