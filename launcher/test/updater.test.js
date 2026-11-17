'use strict';
/**
 * End-to-end scenarios: the real Updater against a local fake of GitHub, writing to a temporary data folder and
 * launching a stand-in game process.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Updater } = require('../src/core/updater');
const { Settings } = require('../src/core/config');
const { tmpDir, makePackage, FakeGitHub, webRuntime, waitFor } = require('./helpers');

const PLAT = { os: 'linux', arch: 'x64' };

function mk(gh, root, extra = {}) {
  const settings = new Settings(path.join(root, 'launcher', 'settings.json')).load();
  const log = [];
  const u = new Updater({
    config: gh.config(extra.config), root, fetch, platform: extra.platform || PLAT, launcherVersion: extra.launcherVersion || '1.0.0',
    settings, webRuntime, log: (m) => log.push(m), retryDelays: [50, 50], ...(extra.opts || {}),
  });
  u.logLines = log;
  return u;
}
const settle = (u, ms = 10000) => waitFor(u, (s) => !['checking', 'downloading', 'installing', 'verifying'].includes(s.phase), ms);
const gamePkg = (v, extra = {}, build = {}) => makePackage(v, { 'index.html': `<html>Ashen Descent ${v}</html>`, 'data/runes.json': '[1,2,3]', ...extra }, build);

test('scenario: first installation, then Play launches the game and the launcher returns to ready', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [gamePkg('2.0.0')], { notes: '## The Descent opens\n- 40 floors' });
  const root = tmpDir('upd');
  const u = mk(gh, root);
  const phases = [];
  u.on('state', (s) => { if (phases.at(-1) !== s.phase) phases.push(s.phase); });
  let sawProgress = null;
  u.on('state', (s) => { if (s.phase === 'downloading' && s.progress && s.progress.received > 0) sawProgress = s.progress; });
  await u.start();
  const s = u.state;
  assert.equal(s.phase, 'ready', JSON.stringify(s.error));
  assert.deepEqual(phases, ['checking', 'downloading', 'installing', 'verifying', 'ready']);
  assert.equal(s.installed.version, '2.0.0'); assert.equal(s.available.version, '2.0.0');
  assert.match(s.available.notes, /40 floors/);
  assert.ok(sawProgress && sawProgress.total > 0 && typeof sawProgress.speed === 'number');
  assert.equal(s.canPlay, true);

  // Play
  const marker = path.join(root, 'launched.json');
  process.env.ASHEN_TEST_MARKER = marker; process.env.ASHEN_TEST_GAME_MS = '600';
  t.after(() => { delete process.env.ASHEN_TEST_MARKER; delete process.env.ASHEN_TEST_GAME_MS; });
  await u.play();
  assert.equal(u.state.phase, 'running');
  assert.equal(u.state.canPlay, false, 'Play disabled while the game runs');
  await assert.rejects(u.play(), /already running|not ready/, 'no duplicate launches');
  await waitFor(u, (st) => st.phase === 'ready', 8000);
  const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
  const dir = path.join(root, 'game', 'versions', '2.0.0');
  assert.equal(fs.realpathSync(m.cwd), fs.realpathSync(dir), 'working folder is the install folder');
  assert.equal(m.entry, path.join(dir, 'index.html'));
  assert.match(m.entryText, /Ashen Descent 2.0.0/);
  assert.equal(m.userData, path.join(root, 'userdata'));
  assert.equal(fs.existsSync(path.join(root, 'game', 'game-process.json')), false, 'process record cleared on exit');
});

test('scenario: update from an older version removes obsolete files; already-latest makes no download', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('1.9.0', [gamePkg('1.9.0', { 'legacy/old.js': 'remove me' })]);
  const root = tmpDir('upd');
  let u = mk(gh, root);
  await u.start();
  assert.equal(u.state.installed.version, '1.9.0');
  fs.writeFileSync(path.join(root, 'userdata', 'profile', 'saves.db'), 'hero data');

  // Already on the latest: a conditional request (304) and no download.
  const dl = gh.hits.downloads;
  u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.equal(gh.hits.downloads, dl + 1, 'only the small manifest was fetched');
  assert.ok(gh.hits.notModified >= 1, 'release list served from cache with ETag');

  gh.addRelease('2.0.0', [gamePkg('2.0.0', { 'new/feature.js': 'hi' })], { notes: 'Big update' });
  u = mk(gh, root); await u.start();
  const s = u.state;
  assert.equal(s.phase, 'ready', JSON.stringify(s.error));
  assert.equal(s.installed.version, '2.0.0');
  const vdir = path.join(root, 'game', 'versions');
  assert.deepEqual(fs.readdirSync(vdir), ['2.0.0']);
  assert.equal(fs.existsSync(path.join(vdir, '2.0.0', 'legacy', 'old.js')), false, 'obsolete file gone');
  assert.ok(fs.existsSync(path.join(vdir, '2.0.0', 'new', 'feature.js')));
  assert.equal(fs.readFileSync(path.join(root, 'userdata', 'profile', 'saves.db'), 'utf8'), 'hero data', 'saves preserved');
  assert.deepEqual(fs.readdirSync(path.join(root, 'game', 'downloads')), [], 'downloaded package removed after install');
});

test('scenario: network unavailable', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [gamePkg('2.0.0')]);
  // Nothing installed: failure with Retry, and no Play button.
  const empty = tmpDir('upd');
  gh.mode.offline = true;
  let u = mk(gh, empty); await u.start();
  assert.equal(u.state.phase, 'failed');
  assert.equal(u.state.canPlay, false); assert.equal(u.state.canRetry, true);
  assert.equal(u.state.error.kind, 'network');
  // Retry once the network is back installs the game.
  gh.mode.offline = false;
  await u.retry();
  assert.equal(u.state.phase, 'ready'); assert.equal(u.state.installed.version, '2.0.0');
  // Installed copy + network down: offline play with an explanation.
  gh.mode.offline = true;
  u = mk(gh, empty); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.equal(u.state.canPlay, true); assert.equal(u.state.canRetry, true);
  assert.equal(u.state.error.offline, true);
  assert.match(u.state.notice, /still play version 2\.0\.0/);
});

test('scenario: GitHub rate limit, invalid metadata and missing assets are handled', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [gamePkg('2.0.0')]);
  const root = tmpDir('upd');
  // Rate limited with no cache: clear message, Retry.
  gh.mode.rateLimit = true;
  let u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'failed'); assert.equal(u.state.error.kind, 'rate-limit'); assert.match(u.state.error.detail, /Try again after/);
  gh.mode.rateLimit = false;
  await u.retry(); assert.equal(u.state.phase, 'ready');
  // Rate limited with a cached list: the cached list is used and the player is told.
  gh.mode.rateLimit = true;
  u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.match(u.state.notice, /last known release list/);
  gh.mode.rateLimit = false;
  // Newer releases that are broken are skipped; the newest usable one is chosen.
  gh.addRelease('2.1.0', [gamePkg('2.1.0')], { skipAssets: ['AshenDescent-2.1.0-any-any.zip'] });
  gh.addRelease('2.2.0', [gamePkg('2.2.0')], { manifest: { version: '9.9.9' } });
  gh.addRelease('2.3.0', [gamePkg('2.3.0')], { skipManifest: true });
  u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.equal(u.state.available.version, '2.0.0');
  assert.ok(u.logLines.some((l) => /skip v2.1.0: asset .* is missing/.test(l)));
  assert.ok(u.logLines.some((l) => /skip v2.2.0: invalid manifest/.test(l)));
  // A garbage API reply is an error, not a crash; Play still works offline.
  gh.mode.garbage = true; fs.rmSync(path.join(root, 'launcher', 'cache'), { recursive: true, force: true });
  u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.equal(u.state.error.kind, 'manifest'); assert.equal(u.state.canPlay, true);
  gh.mode.garbage = false;
  // No build for this OS.
  const g2 = await new FakeGitHub().start(); t.after(() => g2.stop());
  g2.addRelease('2.0.0', [gamePkg('2.0.0', {}, { os: 'windows', arch: 'x64', runtime: 'native', executable: 'AshenDescent.exe', file: 'AshenDescent-2.0.0-windows-x64.zip' })]);
  u = mk(g2, tmpDir('upd')); await u.start();
  assert.equal(u.state.phase, 'failed'); assert.equal(u.state.error.kind, 'no-compatible-build');
  // Release needs a newer launcher.
  const g3 = await new FakeGitHub().start(); t.after(() => g3.stop());
  g3.addRelease('3.0.0', [gamePkg('3.0.0')], { manifest: { minLauncherVersion: '2.0.0' } });
  u = mk(g3, tmpDir('upd')); await u.start();
  assert.equal(u.state.error.kind, 'launcher-too-old');
});

test('scenario: stable releases by default, prereleases only when switched on', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [gamePkg('2.0.0')]);
  gh.addRelease('2.1.0-beta.1', [gamePkg('2.1.0-beta.1')], { prerelease: true });
  const root = tmpDir('upd');
  const u = mk(gh, root); await u.start();
  assert.equal(u.state.installed.version, '2.0.0');
  await u.setAllowPrerelease(true);
  assert.equal(u.state.installed.version, '2.1.0-beta.1');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'launcher', 'settings.json'), 'utf8')).allowPrerelease, true);
  await u.setAllowPrerelease(false);
  assert.equal(u.state.installed.version, '2.1.0-beta.1', 'no automatic downgrade');
  assert.match(u.state.notice, /newer than the latest stable release/);
});

test('scenario: corrupted or incomplete downloads', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  const pkg = gamePkg('2.0.0', { 'big.bin': crypto.randomBytes(300000).toString('hex') });
  gh.addRelease('2.0.0', [pkg]);
  const root = tmpDir('upd');
  // Corrupted: checksum failure, nothing installed, Retry offered; retry succeeds once the file is good.
  gh.corrupt.add(pkg.build.file);
  const u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'failed'); assert.equal(u.state.error.kind, 'integrity'); assert.equal(u.state.canPlay, false);
  assert.equal(fs.existsSync(path.join(root, 'game', 'versions', '2.0.0')), false);
  gh.corrupt.delete(pkg.build.file);
  // Incomplete: the connection drops part way; the updater resumes on its own with a Range request.
  gh.dropOnce.set(pkg.build.file, 200000);
  await u.retry();
  assert.equal(u.state.phase, 'ready', JSON.stringify(u.state.error));
  assert.ok(gh.hits.ranges.some((r) => r.startsWith('bytes=')), 'resumed with Range');
  assert.ok(u.logLines.some((l) => /download interrupted/.test(l)));
});

test('scenario: interrupted installation is recovered when the launcher starts', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('1.0.0', [gamePkg('1.0.0')]);
  const root = tmpDir('upd');
  await mk(gh, root).start();
  gh.addRelease('1.1.0', [gamePkg('1.1.0')]);
  // Simulate the launcher dying between moving the new files in and switching to them.
  const crashing = mk(gh, root, { opts: { installerHooks: { phase: (n) => { if (n === 'moved') throw Object.assign(new Error('power cut'), { simulated: true }); } } } });
  await crashing.start();
  // The thrown error is handled in-process (the old version stays live) ...
  assert.equal(crashing.state.installed.version, '1.0.0');
  assert.equal(crashing.state.phase, 'failed'); assert.equal(crashing.state.canPlay, true, 'old version playable');
  // ... and a fresh launcher start installs the update cleanly.
  const u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.equal(u.state.installed.version, '1.1.0');
  assert.deepEqual(fs.readdirSync(path.join(root, 'game', 'versions')), ['1.1.0']);
});

test('scenario: the game is running, so the update waits until it closes', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('1.0.0', [gamePkg('1.0.0')]);
  const root = tmpDir('upd');
  const u = mk(gh, root); await u.start();
  process.env.ASHEN_TEST_GAME_MS = '1500'; t.after(() => { delete process.env.ASHEN_TEST_GAME_MS; });
  await u.play();
  gh.addRelease('1.1.0', [gamePkg('1.1.0')]);
  // A second launcher starts while the game is open (it finds the game through game-process.json).
  const other = mk(gh, root); await other.start();
  assert.equal(other.state.phase, 'running');
  assert.equal(other.state.updatePending, true);
  assert.match(other.state.message, /when you close the game/);
  assert.equal(other.state.installed.version, '1.0.0', 'files not replaced while running');
  assert.deepEqual(fs.readdirSync(path.join(root, 'game', 'versions')), ['1.0.0']);
  // When the game exits, the waiting update installs.
  await waitFor(other, (s) => s.phase === 'ready' && s.installed && s.installed.version === '1.1.0', 12000);
  await settle(u);
});

test('scenario: a damaged installation is repaired, and Play is refused until it is', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [gamePkg('2.0.0')]);
  const root = tmpDir('upd');
  let u = mk(gh, root); await u.start();
  const dir = path.join(root, 'game', 'versions', '2.0.0');
  fs.rmSync(path.join(dir, 'index.html'));
  gh.mode.offline = true;
  u = mk(gh, root); await u.start();
  assert.equal(u.state.phase, 'failed'); assert.equal(u.state.canPlay, false, 'no misleading Play button');
  assert.match(u.state.message, /damaged/);
  gh.mode.offline = false;
  await u.retry();
  assert.equal(u.state.phase, 'ready'); assert.ok(fs.existsSync(path.join(dir, 'index.html')), 'repaired');
});
