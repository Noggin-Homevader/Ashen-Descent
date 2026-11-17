'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Installer } = require('../src/core/installer');
const { InstallLock } = require('../src/core/lock');
const { tmpDir, makePackage } = require('./helpers');

const CRASH = path.join(__dirname, 'fixtures', 'crash-install.js');
const read = (p) => fs.readFileSync(p, 'utf8');

async function setup(versionFiles = { 'index.html': 'v1', 'old-only.js': 'obsolete', 'assets/a.png': 'A1' }, build = {}) {
  const root = tmpDir('inst');
  const inst = new Installer(root);
  await inst.init();
  const p1 = makePackage('1.0.0', versionFiles, build);
  const a1 = path.join(root, 'p1.zip'); fs.writeFileSync(a1, p1.buf);
  await inst.install({ version: '1.0.0', archive: a1, build: p1.build });
  return { root, inst, L: inst.L };
}

test('installer: first install, then a clean update removes obsolete files and keeps player data', async () => {
  const { root, inst, L } = await setup({ 'index.html': 'v1', 'old-only.js': 'obsolete', 'assets/a.png': 'A1', 'saves/slot1.sav': 'default' }, { preserve: ['saves/', 'settings.ini'] });
  let v = await inst.verifyCurrent({ deep: true });
  assert.equal(v.ok, true); assert.equal(v.version, '1.0.0');
  // Player data: in userdata/ (web runtime profile) and inside the install folder (declared "preserve").
  fs.writeFileSync(path.join(L.profile, 'Local Storage.leveldb'), 'my saves');
  fs.writeFileSync(path.join(L.screenshots, 'shot.png'), 'png');
  fs.writeFileSync(path.join(v.abs, 'saves', 'slot1.sav'), 'my hero, level 40');
  fs.writeFileSync(path.join(v.abs, 'settings.ini'), 'volume=3');
  assert.equal((await inst.verifyCurrent()).ok, true, 'changing preserved files does not count as damage');

  const p2 = makePackage('1.1.0', { 'index.html': 'v2', 'assets/a.png': 'A2', 'assets/new.png': 'N', 'saves/slot1.sav': 'default' }, { preserve: ['saves/', 'settings.ini'] });
  const a2 = path.join(root, 'p2.zip'); fs.writeFileSync(a2, p2.buf);
  await inst.install({ version: '1.1.0', archive: a2, build: p2.build });
  v = await inst.verifyCurrent({ deep: true });
  assert.equal(v.ok, true); assert.equal(v.version, '1.1.0');
  assert.equal(read(path.join(v.abs, 'index.html')), 'v2');
  assert.equal(fs.existsSync(path.join(v.abs, 'old-only.js')), false, 'obsolete file removed');
  assert.deepEqual(fs.readdirSync(L.versions), ['1.1.0'], 'old version folder removed');
  assert.equal(read(path.join(v.abs, 'saves', 'slot1.sav')), 'my hero, level 40', 'save inside install folder kept');
  assert.equal(read(path.join(v.abs, 'settings.ini')), 'volume=3', 'settings kept');
  assert.equal(read(path.join(L.profile, 'Local Storage.leveldb')), 'my saves', 'profile untouched');
  assert.equal(read(path.join(L.screenshots, 'shot.png')), 'png', 'screenshots untouched');
  assert.deepEqual(fs.readdirSync(L.staging), [], 'staging emptied');
  assert.equal(fs.existsSync(L.journal), false);
  const info = await inst.launchInfo();
  assert.equal(info.executable, path.join(v.abs, 'index.html'));
  assert.equal(info.cwd, v.abs);
  assert.ok(root);
});

test('installer: a package missing its executable is refused and the old version stays live', async () => {
  const { root, inst, L } = await setup();
  const bad = makePackage('1.1.0', { 'readme.txt': 'no game here' });
  const a = path.join(root, 'bad.zip'); fs.writeFileSync(a, bad.buf);
  await assert.rejects(inst.install({ version: '1.1.0', archive: a, build: bad.build }), /missing index.html/);
  const v = await inst.verifyCurrent({ deep: true });
  assert.equal(v.ok, true); assert.equal(v.version, '1.0.0');
  assert.deepEqual(fs.readdirSync(L.versions), ['1.0.0']);
  assert.deepEqual(fs.readdirSync(L.staging), []);
  assert.equal(fs.existsSync(L.journal), false);
});

for (const [phase, expect] of [['extracted', 'rolled-back'], ['verified', 'rolled-back'], ['before-switch', 'rolled-back'], ['moved', 'rolled-back'], ['switched', 'completed'], ['cleaned', null]]) {
  test(`installer: process killed at "${phase}" is recovered on the next start`, async () => {
    const { root, inst, L } = await setup();
    fs.writeFileSync(path.join(L.profile, 'save.dat'), 'precious');
    const p2 = makePackage('2.0.0', { 'index.html': 'v2' });
    const a2 = path.join(root, 'p2.zip'); fs.writeFileSync(a2, p2.buf);
    const r = spawnSync(process.execPath, [CRASH, root, a2, JSON.stringify(p2.build), '2.0.0', phase], { encoding: 'utf8' });
    assert.equal(r.status, 70, r.stderr);
    const again = new Installer(root);
    const rec = await again.recover();
    if (expect === null) assert.ok(rec === null || rec.action === 'completed');
    else assert.equal(rec && rec.action, expect);
    const v = await again.verifyCurrent({ deep: true });
    assert.equal(v.ok, true, `installation valid after recovery: ${v.problems}`);
    assert.equal(v.version, expect === 'rolled-back' ? '1.0.0' : '2.0.0');
    assert.deepEqual(fs.readdirSync(L.versions), [v.dir], 'no leftover version folders');
    assert.deepEqual(fs.readdirSync(L.staging), [], 'no leftover staging');
    assert.equal(fs.existsSync(L.journal), false);
    assert.equal(read(path.join(L.profile, 'save.dat')), 'precious');
    assert.ok(inst);
  });
}

test('installer: repairing the same version keeps the old copy until the switch', async () => {
  const { root, inst, L } = await setup();
  const v1 = await inst.verifyCurrent();
  fs.unlinkSync(path.join(v1.abs, 'old-only.js'));
  assert.equal((await inst.verifyCurrent()).ok, false, 'damage detected');
  const p = makePackage('1.0.0', { 'index.html': 'v1', 'old-only.js': 'obsolete', 'assets/a.png': 'A1' });
  const a = path.join(root, 'r.zip'); fs.writeFileSync(a, p.buf);
  const r = spawnSync(process.execPath, [CRASH, root, a, JSON.stringify(p.build), '1.0.0', 'moved'], { encoding: 'utf8' });
  assert.equal(r.status, 70, r.stderr);
  // The complete new copy is already in place under the same name, so recovery finishes the repair
  // and removes the displaced old copy.
  assert.equal((await new Installer(root).recover()).action, 'completed');
  assert.deepEqual(fs.readdirSync(L.versions), ['1.0.0']);
  assert.equal((await inst.verifyCurrent({ deep: true })).ok, true);
  // Crash before the new copy is moved in: the old copy is put back.
  fs.unlinkSync(path.join(v1.abs, 'old-only.js'));
  const r2 = spawnSync(process.execPath, [CRASH, root, a, JSON.stringify(p.build), '1.0.0', 'before-switch'], { encoding: 'utf8' });
  assert.equal(r2.status, 70, r2.stderr);
  assert.equal((await new Installer(root).recover()).action, 'rolled-back');
  assert.deepEqual(fs.readdirSync(L.versions), ['1.0.0'], 'displaced copy restored, nothing left over');
  assert.equal((await inst.verifyCurrent()).ok, false, 'still the damaged copy, ready to repair');
  await inst.install({ version: '1.0.0', archive: a, build: p.build });
  assert.equal((await inst.verifyCurrent({ deep: true })).ok, true, 'repaired');
});

test('installer: never deletes outside its managed folders, and a lost current.json is relinked', async () => {
  const { root, inst, L } = await setup();
  await assert.rejects(inst._rm(root), /outside/);
  await assert.rejects(inst._rm(L.versions), /outside/);
  await assert.rejects(inst._rm(L.userdata), /outside/);
  await assert.rejects(inst._rm(path.join(root, '..')), /outside/);
  fs.mkdirSync(path.join(L.versions, 'notes-by-player'));
  fs.writeFileSync(path.join(L.versions, 'notes-by-player', 'x.txt'), 'mine');
  fs.unlinkSync(L.current);
  const v = await inst.verifyCurrent();
  assert.equal(v.ok, true); assert.equal(v.version, '1.0.0');
  const p2 = makePackage('1.2.0', { 'index.html': 'v12' });
  const a2 = path.join(root, 'p.zip'); fs.writeFileSync(a2, p2.buf);
  await inst.install({ version: '1.2.0', archive: a2, build: p2.build });
  assert.ok(fs.existsSync(path.join(L.versions, 'notes-by-player', 'x.txt')), 'unrecognised folder left alone');
  // A pre-existing, non-empty game folder that the launcher did not create is not taken over.
  const other = tmpDir('foreign');
  fs.mkdirSync(path.join(other, 'game')); fs.writeFileSync(path.join(other, 'game', 'theirs.txt'), 'x');
  await assert.rejects(new Installer(other).init(), /not created by the launcher/);
});

test('lock: a second launcher cannot update the same installation; stale locks are replaced', () => {
  const d = tmpDir('lock');
  const f = path.join(d, 'install.lock');
  const a = new InstallLock(f); a.acquire();
  // Simulate another live process owning it.
  fs.writeFileSync(f, JSON.stringify({ pid: process.ppid, host: require('os').hostname(), token: 'other', at: Date.now() }));
  const b = new InstallLock(f);
  assert.throws(() => b.acquire(), /Another Ashen Descent launcher/);
  // Owner gone: stale.
  fs.writeFileSync(f, JSON.stringify({ pid: 2 ** 22 + 12345, host: require('os').hostname(), token: 'dead', at: Date.now() }));
  b.acquire(); assert.equal(b.held, true); b.release();
  assert.equal(fs.existsSync(f), false);
});
