#!/usr/bin/env node
'use strict';
/**
 * Write launcher-manifest.json for a launcher release: which file each kind of install updates from, with its size
 * and SHA-256. The launcher reads it to update itself (launcher/src/core/self-update.js).
 *
 *   node tools/launcher-manifest.js <folder with the built installers> <version>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateLauncherManifest } = require('../launcher/src/core/self-update');

const [dir, version] = process.argv.slice(2);
if (!dir || !version) { console.error('usage: launcher-manifest.js <dir> <version>'); process.exit(2); }
const rules = [
  [/^AshenDescent-Setup\.exe$/, { os: 'windows', arch: 'x64', kind: 'nsis' }],
  [/^AshenDescent-win-x64\.zip$/, { os: 'windows', arch: 'x64', kind: 'zip' }],
  [/-linux-x86_64\.AppImage$/, { os: 'linux', arch: 'x64', kind: 'appimage' }],
  [/-linux-arm64\.AppImage$/, { os: 'linux', arch: 'arm64', kind: 'appimage' }],
  [/-mac-arm64\.dmg$/, { os: 'macos', arch: 'arm64', kind: 'dmg' }],
  [/-mac-x64\.dmg$/, { os: 'macos', arch: 'x64', kind: 'dmg' }],
];
const builds = [];
for (const f of fs.readdirSync(dir).sort()) {
  const r = rules.find(([re]) => re.test(f));
  if (!r) continue;
  const buf = fs.readFileSync(path.join(dir, f));
  builds.push({ ...r[1], file: f, size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
}
const m = { schema: 1, name: 'ashen-descent-launcher', version, builds };
validateLauncherManifest(m, version);
fs.writeFileSync(path.join(dir, 'launcher-manifest.json'), `${JSON.stringify(m, null, 2)}\n`);
console.log(`launcher-manifest.json: ${builds.map((b) => `${b.os}/${b.arch} ${b.kind}`).join(', ')}`);
