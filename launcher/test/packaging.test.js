'use strict';
/** The real game, packaged by tools/package-game.js, installed by the real launcher code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Updater } = require('../src/core/updater');
const { FakeGitHub, tmpDir, webRuntime } = require('./helpers');

const REPO = path.resolve(__dirname, '..', '..');

test('packaging: the real game package installs through the launcher and matches the source', async (t) => {
  const out = path.join('dist', `test-${process.pid}`);
  t.after(() => fs.rmSync(path.join(REPO, out), { recursive: true, force: true }));
  const game = JSON.parse(fs.readFileSync(path.join(REPO, 'game', 'game.json'), 'utf8'));
  const r = spawnSync(process.execPath, [path.join(REPO, 'tools', 'package-game.js'), '--tag', `v${game.version}`, '--out', out], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const v = spawnSync(process.execPath, [path.join(REPO, 'tools', 'verify-release.js'), path.join(REPO, out), '--tag', `v${game.version}`], { encoding: 'utf8' });
  assert.equal(v.status, 0, v.stderr);
  const bad = spawnSync(process.execPath, [path.join(REPO, 'tools', 'package-game.js'), '--tag', 'v0.0.1', '--out', out], { cwd: REPO, encoding: 'utf8' });
  assert.notEqual(bad.status, 0, 'a tag that does not match game.json is refused');

  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  // package-game ran again above and failed before writing, so re-run to restore the output.
  assert.equal(spawnSync(process.execPath, [path.join(REPO, 'tools', 'package-game.js'), '--out', out], { cwd: REPO }).status, 0);
  gh.addReleaseFromDir(`v${game.version}`, path.join(REPO, out));
  const root = tmpDir('pkg');
  const u = new Updater({ config: gh.config(), root, fetch, platform: { os: 'windows', arch: 'x64' }, launcherVersion: '1.0.0', webRuntime });
  await u.start();
  assert.equal(u.state.phase, 'ready', JSON.stringify(u.state.error));
  assert.equal(u.state.installed.version, game.version);
  assert.match(u.state.available.notes, /launcher/);
  const installed = fs.readFileSync(path.join(root, 'game', 'versions', game.version, 'index.html'));
  assert.ok(installed.equals(fs.readFileSync(path.join(REPO, 'game', 'app', 'index.html'))), 'installed game is byte-identical');
});
