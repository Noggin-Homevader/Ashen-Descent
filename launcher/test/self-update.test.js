'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { SelfUpdater, detectInstallKind, swapScript, validateLauncherManifest } = require('../src/core/self-update');
const { GitHubClient } = require('../src/core/github');
const { writeZip } = require('../src/core/zip');
const { FakeGitHub, makePackage, tmpDir } = require('./helpers');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** Publish a launcher release on the fake GitHub, with the files and manifest the build workflow produces. */
function addLauncher(gh, version, { prerelease = false, files } = {}) {
  const tag = `launcher-v${version}`;
  const fl = files || {
    'AshenDescent-Setup.exe': Buffer.from(`setup ${version} `.repeat(500)),
    'AshenDescent-win-x64.zip': writeZip(null, [{ name: 'Ashen Descent.exe', data: Buffer.from(`exe ${version}`) }, { name: 'resources/app.asar', data: Buffer.from('asar'.repeat(100)) }]),
    [`AshenDescentLauncher-${version}-linux-x86_64.AppImage`]: Buffer.from(`appimage ${version}`.repeat(200)),
    [`AshenDescentLauncher-${version}-mac-arm64.dmg`]: Buffer.from(`dmg ${version}`.repeat(200)),
  };
  const dir = tmpDir('rel');
  for (const [n, b] of Object.entries(fl)) fs.writeFileSync(path.join(dir, n), b);
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'tools', 'launcher-manifest.js'), dir, version], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  gh.addReleaseFromDir(tag, dir, { prerelease });
  return fl;
}

const mk = (gh, kind, extra = {}) => new SelfUpdater({
  github: new GitHubClient({ fetch, apiBaseUrl: gh.base, owner: 'Noggin-Homevader', repo: 'Ashen-Descent' }),
  fetch, currentVersion: '1.2.0', platform: { os: 'windows', arch: 'x64' }, kind, dir: tmpDir('su'), execPath: extra.execPath || 'C:\\x\\Ashen Descent.exe', ...extra,
});

test('self-update: picks the newest launcher release and the file for this kind of install', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.1.0', [makePackage('2.1.0', { 'index.html': 'game' })]); // a game release: never a launcher update
  addLauncher(gh, '1.2.0');
  assert.equal(await mk(gh, 'nsis').check(), null, 'same version: nothing to do');
  addLauncher(gh, '1.3.0');
  addLauncher(gh, '1.4.0-beta.1', { prerelease: true });
  const nsis = await mk(gh, 'nsis').check();
  assert.equal(nsis.version, '1.3.0'); assert.equal(nsis.build.file, 'AshenDescent-Setup.exe'); assert.equal(nsis.applies, true);
  assert.equal((await mk(gh, 'nsis').check({ allowPrerelease: true })).version, '1.4.0-beta.1');
  assert.equal((await mk(gh, 'zip').check()).build.file, 'AshenDescent-win-x64.zip');
  const app = await mk(gh, 'appimage', { platform: { os: 'linux', arch: 'x64' } }).check();
  assert.match(app.build.file, /AppImage$/);
  const mac = await mk(gh, 'dmg', { platform: { os: 'macos', arch: 'arm64' } }).check();
  assert.equal(mac.applies, false, 'macOS is told, not auto-installed');
  assert.equal(await mk(gh, 'dev').check(), null, 'running from source never updates');
  assert.equal(await mk(gh, 'nsis', { currentVersion: '9.0.0' }).check(), null, 'never downgrades');
});

test('self-update: downloads are verified; zip installs are staged beside the program folder', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  addLauncher(gh, '1.3.0');
  const appRoot = tmpDir('prog');
  const appDir = path.join(appRoot, 'Launcher');
  fs.mkdirSync(appDir); fs.writeFileSync(path.join(appDir, 'Ashen Descent.exe'), 'old');
  const su = mk(gh, 'zip', { execPath: path.join(appDir, 'Ashen Descent.exe') });
  const info = await su.check();
  const prep = await su.prepare(info);
  assert.equal(prep.staging, `${appDir}.update`);
  assert.equal(fs.readFileSync(path.join(prep.staging, 'Ashen Descent.exe'), 'utf8'), 'exe 1.3.0');
  assert.equal(fs.readFileSync(path.join(appDir, 'Ashen Descent.exe'), 'utf8'), 'old', 'the running copy is untouched until the swap');
  // A tampered download is refused.
  gh.corrupt.add('AshenDescent-Setup.exe');
  const su2 = mk(gh, 'nsis');
  await assert.rejects(su2.prepare(await su2.check()), (e) => e.kind === 'integrity');
});

test('self-update: manifest validation and install detection', () => {
  const good = { schema: 1, name: 'ashen-descent-launcher', version: '1.3.0', builds: [{ os: 'windows', arch: 'x64', kind: 'nsis', file: 'AshenDescent-Setup.exe', size: 10, sha256: 'a'.repeat(64) }] };
  assert.equal(validateLauncherManifest(good, '1.3.0').version, '1.3.0');
  assert.throws(() => validateLauncherManifest(good, '1.4.0'), /does not match/);
  assert.throws(() => validateLauncherManifest({ ...good, name: 'ashen-descent' }, '1.3.0'), /not a launcher manifest/);
  assert.throws(() => validateLauncherManifest({ ...good, builds: [{ ...good.builds[0], file: '../evil.exe' }] }, '1.3.0'), /bad file/);
  const exists = (p) => p.endsWith('Uninstall Ashen Descent.exe');
  assert.equal(detectInstallKind({ platform: 'win32', execPath: 'C:\\P\\Ashen Descent.exe', exists }), 'nsis');
  assert.equal(detectInstallKind({ platform: 'win32', execPath: 'D:\\Ashen Descent\\Launcher\\Ashen Descent.exe', exists: () => false }), 'zip');
  assert.equal(detectInstallKind({ platform: 'linux', env: { APPIMAGE: '/home/a/AD.AppImage' } }), 'appimage');
  assert.equal(detectInstallKind({ platform: 'darwin', env: {} }), 'dmg');
  assert.equal(detectInstallKind({ platform: 'win32', defaultApp: true }), 'dev');
  const s = swapScript({ pid: 4242, appDir: 'D:\\Ashen Descent\\Launcher', staging: 'D:\\Ashen Descent\\Launcher.update' });
  assert.match(s, /PID eq 4242/); assert.match(s, /move "%APP%" "%OLD%"/); assert.match(s, /move "%OLD%" "%APP%"/, 'puts the old copy back on failure');
  assert.ok(s.includes('\r\n'), 'Windows line endings');
});
