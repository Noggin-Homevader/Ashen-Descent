#!/usr/bin/env node
'use strict';
/**
 * Package the game for release and write the launcher's release manifest.
 *
 *   node tools/package-game.js [--tag v2.0.0] [--out dist/game] [--game game]
 *
 * Reads game/game.json (version, builds) and game/CHANGELOG.md (release notes), and writes to the output folder:
 *   AshenDescent-<version>-<os>-<arch>.zip   one per build in game.json
 *   ashen-manifest.json                      the release manifest the launcher reads (docs/RELEASES.md)
 *   SHA256SUMS.txt                           checksums of every file above
 *   release-notes.md                         this version's section of the changelog
 *
 * Every package is unpacked again with the launcher's own extractor and checked before the script finishes,
 * so a package that the launcher would refuse never reaches a release.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { writeZip, extractZip } = require('../launcher/src/core/zip');
const { validateManifest } = require('../launcher/src/core/manifest');
const { safeRelative } = require('../launcher/src/core/paths');
const semver = require('../launcher/src/core/semver');

function args(argv) {
  const o = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument ${a}`);
    const [k, v] = a.includes('=') ? a.slice(2).split(/=(.*)/s) : [a.slice(2), argv[++i]];
    o[k] = v;
  }
  return o;
}

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.name === '.git' || e.name === '.DS_Store' || e.name === 'Thumbs.db') continue;
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error(`${full} is a symbolic link; packages may not contain links.`);
    if (e.isDirectory()) walk(full, base, out);
    else if (e.isFile()) out.push({ rel: path.relative(base, full).split(path.sep).join('/'), full });
  }
  return out;
}

function notesFor(changelog, version) {
  if (!fs.existsSync(changelog)) return '';
  const lines = fs.readFileSync(changelog, 'utf8').split(/\r?\n/);
  const head = new RegExp(`^##\\s+\\[?v?${version.replace(/[.+]/g, '\\$&')}\\]?(\\s|$)`);
  const i = lines.findIndex((l) => head.test(l));
  if (i < 0) return '';
  let j = i + 1;
  while (j < lines.length && !/^##\s/.test(lines[j])) j++;
  return lines.slice(i + 1, j).join('\n').trim();
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function main() {
  const o = args(process.argv);
  const repo = path.resolve(__dirname, '..');
  const gameDir = path.resolve(repo, o.game || 'game');
  const out = path.resolve(repo, o.out || 'dist/game');
  if (!path.relative(repo, out) || path.relative(repo, out).startsWith('..') && !o['allow-outside']) throw new Error('--out must be a folder inside the repository (it is emptied first).');
  const game = JSON.parse(fs.readFileSync(path.join(gameDir, 'game.json'), 'utf8'));
  if (!semver.valid(game.version)) throw new Error(`game.json version "${game.version}" is not a semantic version (e.g. 2.0.1).`);
  const version = semver.parse(game.version).raw;
  if (o.tag) {
    const tv = o.tag.replace(/^v/, '');
    if (!semver.valid(tv) || semver.compare(tv, version) !== 0) {
      throw new Error(`Tag ${o.tag} does not match game.json version ${version}. Set "version" in game/game.json to ${tv} and add a "## ${tv}" section to game/CHANGELOG.md, commit, then tag again.`);
    }
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const builds = [];
  for (const b of game.builds) {
    const appDir = path.resolve(gameDir, b.appDir || 'app');
    if (!fs.existsSync(appDir)) throw new Error(`Build folder ${appDir} does not exist.`);
    const files = walk(appDir);
    if (!files.length) throw new Error(`Build folder ${appDir} is empty.`);
    const names = new Set(files.map((f) => f.rel));
    const executable = safeRelative(b.executable, 'executable');
    for (const r of [executable, ...(b.requiredFiles || [])]) if (!names.has(safeRelative(r, 'required file'))) throw new Error(`${appDir} is missing ${r}.`);
    const file = `AshenDescent-${version}-${b.os}-${b.arch}.zip`;
    const zipPath = path.join(out, file);
    const execs = new Set(b.runtime === 'native' && b.os !== 'windows' ? [executable] : []);
    writeZip(zipPath, files.map((f) => ({ name: f.rel, file: f.full, mode: execs.has(f.rel) || (fs.statSync(f.full).mode & 0o111) ? 0o100755 : 0o100644 })));
    const buf = fs.readFileSync(zipPath);
    builds.push({
      os: b.os, arch: b.arch, runtime: b.runtime || 'native', file, size: buf.length, sha256: sha(buf),
      executable, args: b.args || [], requiredFiles: b.requiredFiles || [executable], preserve: b.preserve || [],
    });
    console.log(`packaged ${file}: ${files.length} files, ${(buf.length / 1048576).toFixed(2)} MB`);
  }

  const releaseNotes = notesFor(path.join(gameDir, 'CHANGELOG.md'), version);
  if (!releaseNotes) console.warn(`warning: game/CHANGELOG.md has no "## ${version}" section; the release will have no notes.`);
  const manifest = { schema: 1, name: game.name || 'ashen-descent', version, releaseNotes, minLauncherVersion: game.minLauncherVersion || null, builds };
  if (!manifest.minLauncherVersion) delete manifest.minLauncherVersion;
  validateManifest(manifest, { tagVersion: version, expectName: 'ashen-descent' });
  fs.writeFileSync(path.join(out, 'ashen-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'release-notes.md'), `${releaseNotes || `Ashen Descent ${version}`}\n`);

  // Unpack every package exactly as the launcher will, and compare.
  for (const b of builds) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-pkg-'));
    try {
      const got = await extractZip(path.join(out, b.file), path.join(tmp, 'x'));
      const appDir = path.resolve(gameDir, game.builds.find((g) => g.os === b.os && g.arch === b.arch).appDir || 'app');
      for (const f of walk(appDir)) {
        const e = got.find((g) => g.path === f.rel);
        if (!e || e.sha256 !== sha(fs.readFileSync(f.full))) throw new Error(`self-check failed for ${f.rel} in ${b.file}`);
      }
      for (const r of b.requiredFiles) if (!got.some((g) => g.path === r)) throw new Error(`self-check: ${r} missing from ${b.file}`);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  const sums = fs.readdirSync(out).filter((f) => f !== 'SHA256SUMS.txt').sort()
    .map((f) => `${sha(fs.readFileSync(path.join(out, f)))}  ${f}`).join('\n');
  fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), `${sums}\n`);
  console.log(`manifest for ${version} written to ${path.relative(repo, out)}/ashen-manifest.json (self-check passed)`);
}

main().catch((e) => { console.error(`package-game: ${e.message}`); process.exit(1); });
