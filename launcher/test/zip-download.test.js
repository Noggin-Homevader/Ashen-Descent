'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeZip, extractZip } = require('../src/core/zip');
const { download } = require('../src/core/download');
const { tmpDir, FakeGitHub, makePackage } = require('./helpers');

const z = (entries) => { const d = tmpDir('zip'); const f = path.join(d, 'p.zip'); writeZip(f, entries, { raw: true }); return { d, f }; };

test('zip: round trip keeps bytes, folders and digests', async () => {
  const big = crypto.randomBytes(300000);
  const { d, f } = z([{ name: 'index.html', data: Buffer.from('<html>ash</html>') }, { name: 'data/', data: '' }, { name: 'data/big.bin', data: big }, { name: 'empty.txt', data: '' }]);
  const out = path.join(d, 'out');
  const files = await extractZip(f, out);
  assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), '<html>ash</html>');
  assert.ok(fs.readFileSync(path.join(out, 'data/big.bin')).equals(big));
  assert.equal(files.find((x) => x.path === 'data/big.bin').sha256, crypto.createHash('sha256').update(big).digest('hex'));
  assert.equal(fs.statSync(path.join(out, 'empty.txt')).size, 0);
});

test('zip: entries that escape the folder are rejected before anything is written', async () => {
  for (const name of ['../escape.txt', 'ok/../../escape.txt', '/abs.txt', 'C:/win.txt', '..\\back.txt', 'a/CON']) {
    const { d, f } = z([{ name: 'fine.txt', data: 'x' }, { name, data: 'pwned' }]);
    const out = path.join(d, 'out');
    await assert.rejects(extractZip(f, out), /Unsafe archive entry/, name);
    assert.equal(fs.existsSync(path.join(d, 'escape.txt')), false);
    assert.equal(fs.existsSync(path.join(out, 'fine.txt')), false, 'nothing written for a hostile archive');
  }
});

test('zip: symlinks, duplicates and file/folder clashes are rejected', async () => {
  let t = z([{ name: 'link', data: '/etc/passwd', mode: 0o120777 }]);
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /symbolic link/);
  t = z([{ name: 'a.txt', data: '1' }, { name: 'A.TXT', data: '2' }]);
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /twice/);
  t = z([{ name: 'a', data: '1' }, { name: 'a/b.txt', data: '2' }]);
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /also a file/);
});

test('zip: damaged data is detected (CRC, size, truncation, not a zip)', async () => {
  let t = z([{ name: 'a.txt', data: 'hello world', crcOverride: 1234 }]);
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /CRC/);
  t = z([{ name: 'a.txt', data: 'hello world', usizeOverride: 5, storeAs: 0 }]);
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /larger than/);
  t = z([{ name: 'a.txt', data: crypto.randomBytes(5000) }]);
  const buf = fs.readFileSync(t.f); fs.writeFileSync(t.f, buf.subarray(0, buf.length - 40));
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /not a ZIP|damaged/);
  fs.writeFileSync(t.f, 'definitely not a zip file, just text that is long enough');
  await assert.rejects(extractZip(t.f, path.join(t.d, 'o')), /not a ZIP/);
});

test('download: completes, then resumes after a dropped connection with a Range request', async () => {
  const gh = await new FakeGitHub().start();
  try {
    const pkg = makePackage('2.0.0', { 'index.html': crypto.randomBytes(400000).toString('base64') });
    gh.addRelease('2.0.0', [pkg]);
    const url = `${gh.base}/dl/v2.0.0/${pkg.build.file}`;
    const d = tmpDir('dl');
    const dest = path.join(d, pkg.build.file);
    gh.dropOnce.set(pkg.build.file, 150000);
    const seen = [];
    await assert.rejects(download({ fetch, url, dest, size: pkg.build.size, sha256: pkg.build.sha256, onProgress: (p) => seen.push(p) }), /download/i);
    const partial = fs.statSync(`${dest}.part`).size;
    assert.ok(partial >= 150000 && partial < pkg.build.size, `kept ${partial} bytes`);
    const r = await download({ fetch, url, dest, size: pkg.build.size, sha256: pkg.build.sha256, onProgress: (p) => seen.push(p) });
    assert.equal(r.reused, false);
    assert.deepEqual(gh.hits.ranges, [`bytes=${partial}-`]);
    assert.ok(fs.readFileSync(dest).equals(pkg.buf));
    assert.equal(fs.existsSync(`${dest}.part`), false);
    assert.ok(seen.some((p) => p.resumed) && seen.at(-1).received === pkg.build.size);
    // A finished, verified file is reused without downloading again.
    const before = gh.hits.downloads;
    assert.equal((await download({ fetch, url, dest, size: pkg.build.size, sha256: pkg.build.sha256 })).reused, true);
    assert.equal(gh.hits.downloads, before);
  } finally { await gh.stop(); }
});

test('download: a corrupted file fails its checksum and is deleted', async () => {
  const gh = await new FakeGitHub().start();
  try {
    const pkg = makePackage('2.0.0', { 'index.html': 'x'.repeat(50000) });
    gh.addRelease('2.0.0', [pkg]);
    gh.corrupt.add(pkg.build.file);
    const dest = path.join(tmpDir('dl'), pkg.build.file);
    await assert.rejects(download({ fetch, url: `${gh.base}/dl/v2.0.0/${pkg.build.file}`, dest, size: pkg.build.size, sha256: pkg.build.sha256 }), (e) => e.kind === 'integrity');
    assert.equal(fs.existsSync(dest), false);
    assert.equal(fs.existsSync(`${dest}.part`), false);
    // Too many bytes is also caught.
    await assert.rejects(download({ fetch, url: `${gh.base}/dl/v2.0.0/${pkg.build.file}`, dest, size: pkg.build.size - 10, sha256: pkg.build.sha256 }), (e) => e.kind === 'integrity');
  } finally { await gh.stop(); }
});
