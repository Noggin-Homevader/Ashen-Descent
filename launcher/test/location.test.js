'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const loc = require('../src/core/location');
const { Updater } = require('../src/core/updater');
const { FakeGitHub, makePackage, tmpDir, webRuntime } = require('./helpers');

test('location: default, chosen and overridden data roots', () => {
  const appData = tmpDir('appdata');
  assert.deepEqual(loc.resolveRoot(appData, {}), { root: path.join(appData, 'Ashen Descent'), source: 'default' });
  const other = tmpDir('drive');
  loc.writeLocation(appData, path.join(other, 'Ashen Descent'));
  assert.deepEqual(loc.resolveRoot(appData, {}), { root: path.join(other, 'Ashen Descent'), source: 'chosen' });
  assert.equal(loc.resolveRoot(appData, { ASHEN_DATA_DIR: other }).source, 'env');
  fs.writeFileSync(loc.locationFile(appData), '\uFEFF{broken');
  assert.equal(loc.resolveRoot(appData, {}).source, 'default', 'an unreadable location file falls back to the default');
  if (process.platform === 'win32') {
    assert.equal(loc.rootForDrive('D:\\', appData, 'C:'), 'D:\\Ashen Descent');
    assert.equal(loc.rootForDrive('C:', appData, 'C:'), path.join(appData, 'Ashen Descent'));
  }
});

test('location: Windows drives are listed with free space; missing drives are skipped', async () => {
  const fake = async (p) => { if (p === 'C:\\') return { bavail: 10, bsize: 1024 ** 3, blocks: 100 }; if (p === 'E:\\') return { bavail: 400, bsize: 1024 ** 3, blocks: 1000 }; throw Object.assign(new Error('no'), { code: 'ENOENT' }); };
  const d = await loc.listDrives({ platform: 'win32', statfs: fake, systemDrive: 'C:' });
  assert.deepEqual(d.map((x) => [x.letter, x.system, Math.round(x.free / 1024 ** 3)]), [['C:', true, 10], ['E:', false, 400]]);
  assert.deepEqual(await loc.listDrives({ platform: 'linux' }), []);
});

test('location: moving an installation keeps the game playable and the saves, and frees the old drive', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [makePackage('2.0.0', { 'index.html': '<html>game</html>', 'big.bin': 'x'.repeat(200000) })]);
  const appData = tmpDir('appdata');
  const from = loc.resolveRoot(appData, {}).root;
  const mk = (root) => new Updater({ config: gh.config(), root, fetch, platform: { os: 'windows', arch: 'x64' }, launcherVersion: '1.0.0', webRuntime });
  let u = mk(from); await u.start();
  assert.equal(u.state.phase, 'ready');
  fs.writeFileSync(path.join(from, 'userdata', 'profile', 'saves.db'), 'level 40 hero');
  fs.mkdirSync(path.join(from, 'launcher', 'electron'), { recursive: true });
  fs.writeFileSync(path.join(from, 'launcher', 'electron', 'in-use.db'), 'chromium');

  const to = path.join(tmpDir('d-drive'), 'Ashen Descent');
  const seen = [];
  const r = await loc.moveData({ from, to, appData, onProgress: (p) => seen.push(p) });
  assert.ok(r.files >= 3 && r.bytes > 200000);
  assert.equal(seen.at(-1).done, seen.at(-1).total);
  assert.equal(loc.resolveRoot(appData, {}).root, to, 'location.json now points at the new drive');
  assert.equal(fs.readFileSync(path.join(to, 'userdata', 'profile', 'saves.db'), 'utf8'), 'level 40 hero');
  assert.equal(fs.existsSync(path.join(from, 'game')), false, 'old game files removed');
  assert.equal(fs.existsSync(path.join(from, 'userdata')), false, 'old saves removed only after the copy was verified');
  assert.ok(fs.existsSync(path.join(from, 'launcher', 'electron', 'in-use.db')), 'the live launcher profile is left alone');
  assert.ok(fs.existsSync(loc.locationFile(appData)), 'location.json stays in the default folder');

  // The launcher, restarted on the new root, finds a valid install and does not download again.
  const before = gh.hits.downloads;
  u = mk(to); await u.start();
  assert.equal(u.state.phase, 'ready'); assert.equal(u.state.installed.version, '2.0.0');
  assert.equal(gh.hits.downloads - before, 1, 'only the small manifest');

  // Refusals: into itself, onto an existing install, during an install.
  await assert.rejects(loc.moveData({ from: to, to: path.join(to, 'sub'), appData }), /inside/);
  await assert.rejects(loc.moveData({ from, to, appData }), /already contains/);
  fs.writeFileSync(path.join(to, 'game', 'install-journal.json'), '{}');
  await assert.rejects(loc.moveData({ from: to, to: path.join(tmpDir('e'), 'Ashen Descent'), appData }), /still being installed/);
  fs.unlinkSync(path.join(to, 'game', 'install-journal.json'));
  // Not enough room: nothing is copied and the old install stays.
  await assert.rejects(loc.moveData({ from: to, to: path.join(tmpDir('f'), 'Ashen Descent'), appData, statfs: async () => ({ bavail: 1, bsize: 1024 }) }), /Not enough free space/);
  assert.equal(loc.resolveRoot(appData, {}).root, to);
  assert.ok(fs.existsSync(path.join(to, 'game', 'current.json')));
});
