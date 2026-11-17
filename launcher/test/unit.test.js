'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const semver = require('../src/core/semver');
const { pickBuild, current } = require('../src/core/platform');
const { validateManifest } = require('../src/core/manifest');
const { safeRelative } = require('../src/core/paths');
const { tagVersion } = require('../src/core/select');
const { normalise } = require('../src/core/config');

test('semver: precedence follows semver.org', () => {
  const order = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.0.1', '1.10.0', '2.0.0'];
  for (let i = 0; i < order.length - 1; i++) assert.equal(semver.compare(order[i], order[i + 1]), -1, `${order[i]} < ${order[i + 1]}`);
  assert.equal(semver.compare('v2.0.0', '2.0.0+build.5'), 0);
  assert.equal(semver.compare('2.10.0', '2.9.9'), 1, 'numeric, not string, comparison');
  for (const bad of ['2.0', '02.0.0', 'v2.0.0.1', '', 'latest', '2.0.0-', null]) assert.equal(semver.valid(bad), false, String(bad));
  assert.equal(semver.folderName('2.0.0+exp.sha'), '2.0.0_exp.sha');
});

test('release tags: only game tags with the prefix count', () => {
  assert.equal(tagVersion('v2.0.0', 'v'), '2.0.0');
  assert.equal(tagVersion('launcher-v1.0.0', 'v'), null);
  assert.equal(tagVersion('nightly', 'v'), null);
  assert.equal(tagVersion('v2.1.0-beta.1', 'v'), '2.1.0-beta.1');
});

test('platform: best build is chosen, others rejected', () => {
  const b = (os, arch) => ({ os, arch });
  const builds = [b('windows', 'x64'), b('linux', 'any'), b('any', 'any'), b('macos', 'x64')];
  assert.deepEqual(pickBuild(builds, { os: 'windows', arch: 'x64' }), b('windows', 'x64'));
  assert.deepEqual(pickBuild(builds, { os: 'linux', arch: 'arm64' }), b('linux', 'any'));
  assert.deepEqual(pickBuild(builds, { os: 'macos', arch: 'arm64' }), b('macos', 'x64'), 'Rosetta fallback');
  assert.deepEqual(pickBuild(builds, { os: 'windows', arch: 'arm64' }), b('any', 'any'));
  assert.equal(pickBuild([b('windows', 'x64')], { os: 'linux', arch: 'x64' }), null);
  assert.deepEqual(current({ platform: 'win32', arch: 'x64' }), { os: 'windows', arch: 'x64' });
  assert.deepEqual(current({ platform: 'darwin', arch: 'arm64' }), { os: 'macos', arch: 'arm64' });
});

test('paths: unsafe archive and manifest paths are rejected', () => {
  for (const bad of ['../evil', 'a/../../evil', '/etc/passwd', 'C:\\Windows\\x', 'C:x', '\\\\server\\share', '..\\evil', 'CON', 'aux.txt', 'name.', 'a\u0000b', 'a:b']) {
    assert.throws(() => safeRelative(bad), /Unsafe/, bad);
  }
  assert.equal(safeRelative('a\\b/./c.txt'), 'a/b/c.txt');
  assert.equal(safeRelative('saves/', 'p', { allowDirSuffix: true }), 'saves');
});

test('manifest: validation catches bad metadata', () => {
  const good = { schema: 1, name: 'ashen-descent', version: '2.0.0', builds: [{ os: 'any', arch: 'any', runtime: 'web', file: 'A-2.0.0.zip', size: 10, sha256: 'a'.repeat(64), executable: 'index.html', args: ['--x'] }] };
  const m = validateManifest(good, { tagVersion: '2.0.0', expectName: 'ashen-descent' });
  assert.deepEqual(m.builds[0].requiredFiles, ['index.html'], 'executable is always required');
  const variants = [
    [{ schema: 2 }, /schema/],
    [{ version: 'two' }, /valid version/],
    [{ builds: [] }, /no builds/],
    [{ builds: [{ ...good.builds[0], sha256: 'xyz' }] }, /sha256/],
    [{ builds: [{ ...good.builds[0], size: -1 }] }, /size/],
    [{ builds: [{ ...good.builds[0], executable: '../game.exe' }] }, /executable/],
    [{ builds: [{ ...good.builds[0], file: '../x.zip' }] }, /file/],
    [{ builds: [{ ...good.builds[0], os: 'plan9' }] }, /operating system/],
    [{ builds: [good.builds[0], good.builds[0]] }, /Two builds/],
    [{ name: 'other-game' }, /not "ashen-descent"/],
  ];
  for (const [patch, re] of variants) assert.throws(() => validateManifest({ ...good, ...patch }, { expectName: 'ashen-descent' }), re, JSON.stringify(patch));
  assert.throws(() => validateManifest(good, { tagVersion: '2.0.1' }), /does not match the release tag/);
});

test('config: repository must be named; no token fields are used', () => {
  assert.throws(() => normalise({ github: { owner: '', repo: '' } }, 'x'), /github.owner/);
  const c = normalise({ github: { owner: 'Noggin-Homevader', repo: 'Ashen-Descent' }, apiBaseUrl: 'https://api.github.com/' }, 'x');
  assert.equal(c.apiBaseUrl, 'https://api.github.com');
  assert.equal(c.allowPrerelease, false);
  const shipped = require('../launcher.config.json');
  assert.equal(JSON.stringify(shipped).match(/token|ghp_|github_pat_/i), null, 'shipped config holds no token');
});
