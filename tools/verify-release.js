#!/usr/bin/env node
'use strict';
/**
 * Check a folder of release files (from package-game.js, or downloaded from a GitHub release) the way the
 * launcher will: the manifest is valid, and every package listed has the right size and SHA-256.
 *
 *   node tools/verify-release.js dist/game [--tag v2.0.0]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateManifest } = require('../launcher/src/core/manifest');

const dir = path.resolve(process.argv[2] || 'dist/game');
const ti = process.argv.indexOf('--tag');
const tag = ti > 0 ? process.argv[ti + 1].replace(/^v/, '') : undefined;
try {
  const m = validateManifest(JSON.parse(fs.readFileSync(path.join(dir, 'ashen-manifest.json'), 'utf8')), { tagVersion: tag, expectName: 'ashen-descent' });
  for (const b of m.builds) {
    const f = path.join(dir, b.file);
    if (!fs.existsSync(f)) throw new Error(`${b.file} is listed in the manifest but missing.`);
    const buf = fs.readFileSync(f);
    if (buf.length !== b.size) throw new Error(`${b.file} is ${buf.length} bytes; the manifest says ${b.size}.`);
    if (crypto.createHash('sha256').update(buf).digest('hex') !== b.sha256) throw new Error(`${b.file} does not match its SHA-256 in the manifest.`);
    console.log(`ok ${b.os}/${b.arch} ${b.file} (${b.size} bytes)`);
  }
  console.log(`release ${m.version} is consistent`);
} catch (e) { console.error(`verify-release: ${e.message}`); process.exit(1); }
