'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { writeZip } = require('../src/core/zip');
const { normalise } = require('../src/core/config');

function tmpDir(tag = 'ad') { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

/** Build a game package and its manifest entry in memory. files: { 'index.html': 'text', ... } */
function makePackage(version, files, build = {}) {
  const file = build.file || `AshenDescent-${version}-any-any.zip`;
  const buf = writeZip(null, Object.entries(files).map(([name, data]) => ({ name, data: Buffer.from(data) })));
  return {
    buf,
    build: {
      os: 'any', arch: 'any', runtime: 'web', executable: 'index.html', args: [], requiredFiles: ['index.html'], preserve: [],
      ...build, file, size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    },
  };
}

/** A local stand-in for api.github.com and release downloads. */
class FakeGitHub {
  constructor() {
    this.releases = [];
    this.assets = new Map();
    this.mode = {};            // rateLimit, error500, offline
    this.hits = { api: 0, notModified: 0, downloads: 0, ranges: [] };
    this.dropOnce = new Map(); // asset name -> byte count after which the connection is cut, once
    this.corrupt = new Set();  // asset names served with one byte flipped
    this.server = http.createServer((q, s) => this._handle(q, s));
    this.sockets = new Set();
    this.server.on('connection', (c) => { this.sockets.add(c); c.on('close', () => this.sockets.delete(c)); });
  }

  async start() { await new Promise((r) => this.server.listen(0, '127.0.0.1', r)); this.base = `http://127.0.0.1:${this.server.address().port}`; return this; }
  async stop() { for (const c of this.sockets) c.destroy(); await new Promise((r) => this.server.close(r)); }

  config(extra = {}) { return normalise({ github: { owner: 'Noggin-Homevader', repo: 'Ashen-Descent' }, apiBaseUrl: this.base, requestTimeoutMs: 3000, downloadStallTimeoutMs: 3000, ...extra }, 'test'); }

  /** Publish a release. pkgs: [makePackage(...)] */
  addRelease(version, pkgs, { prerelease = false, draft = false, notes = `Notes for ${version}`, manifest: mPatch, skipManifest = false, skipAssets = [] } = {}) {
    const tag = `v${version}`;
    const assets = [];
    const addAsset = (name, buf) => { this.assets.set(`${tag}/${name}`, buf); assets.push({ name, size: buf.length, state: 'uploaded', browser_download_url: `${this.base}/dl/${tag}/${name}` }); };
    for (const p of pkgs) if (!skipAssets.includes(p.build.file)) addAsset(p.build.file, p.buf);
    const manifest = { schema: 1, name: 'ashen-descent', version, releaseNotes: notes, minLauncherVersion: '1.0.0', builds: pkgs.map((p) => p.build), ...(mPatch || {}) };
    if (!skipManifest) addAsset('ashen-manifest.json', Buffer.from(JSON.stringify(manifest)));
    this.releases.unshift({ tag_name: tag, name: `Ashen Descent ${version}`, draft, prerelease, body: notes, published_at: new Date().toISOString(), html_url: `${this.base}/releases/${tag}`, assets });
    return manifest;
  }

  /** Publish a release from files on disk (e.g. the output of tools/package-game.js). */
  addReleaseFromDir(tag, dir, { prerelease = false, notes = '' } = {}) {
    const assets = [];
    for (const name of fs.readdirSync(dir)) {
      const buf = fs.readFileSync(path.join(dir, name));
      this.assets.set(`${tag}/${name}`, buf);
      assets.push({ name, size: buf.length, state: 'uploaded', browser_download_url: `${this.base}/dl/${tag}/${name}` });
    }
    this.releases.unshift({ tag_name: tag, draft: false, prerelease, body: notes, published_at: new Date().toISOString(), html_url: `${this.base}/releases/${tag}`, assets });
  }

  _etag() { return `"${crypto.createHash('sha1').update(JSON.stringify(this.releases)).digest('hex')}"`; }

  _handle(q, s) {
    if (this.mode.offline) { q.socket.destroy(); return; }
    const u = new URL(q.url, this.base);
    if (u.pathname === '/repos/Noggin-Homevader/Ashen-Descent/releases') {
      this.hits.api++;
      if (this.mode.rateLimit) { s.writeHead(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1800), 'content-type': 'application/json' }); return s.end('{"message":"API rate limit exceeded"}'); }
      if (this.mode.error500) { s.writeHead(502); return s.end('bad gateway'); }
      if (this.mode.garbage) { s.writeHead(200, { 'content-type': 'application/json' }); return s.end('{"not":"a list"}'); }
      const etag = this._etag();
      if (q.headers['if-none-match'] === etag) { this.hits.notModified++; s.writeHead(304, { etag }); return s.end(); }
      s.writeHead(200, { 'content-type': 'application/json', etag, 'x-ratelimit-remaining': '59' });
      return s.end(JSON.stringify(this.releases));
    }
    if (u.pathname.startsWith('/repos/')) { s.writeHead(404); return s.end('{"message":"Not Found"}'); }
    const m = /^\/dl\/([^/]+)\/([^/]+)$/.exec(u.pathname);
    if (m) {
      const key = `${m[1]}/${m[2]}`;
      let buf = this.assets.get(key);
      if (!buf) { s.writeHead(404); return s.end('Not Found'); }
      this.hits.downloads++;
      if (this.corrupt.has(m[2])) { buf = Buffer.from(buf); buf[Math.floor(buf.length / 2)] ^= 0xff; }
      let start = 0;
      const range = q.headers.range;
      if (range) {
        this.hits.ranges.push(range);
        const r = /bytes=(\d+)-/.exec(range);
        start = r ? Number(r[1]) : 0;
        if (start >= buf.length) { s.writeHead(416, { 'content-range': `bytes */${buf.length}` }); return s.end(); }
        s.writeHead(206, { 'content-length': buf.length - start, 'content-range': `bytes ${start}-${buf.length - 1}/${buf.length}`, 'accept-ranges': 'bytes' });
      } else s.writeHead(200, { 'content-length': buf.length, 'accept-ranges': 'bytes' });
      const body = buf.subarray(start);
      if (this.mode.slowBps) {
        // Trickle the bytes out so a download can be watched (UI checks).
        let i = 0; const step = Math.max(1024, Math.floor(this.mode.slowBps / 10));
        const tick = () => { if (s.destroyed) return; if (i >= body.length) return s.end(); s.write(body.subarray(i, i + step)); i += step; setTimeout(tick, 100); };
        return tick();
      }
      const drop = this.dropOnce.get(m[2]);
      if (drop != null && drop > start) {
        this.dropOnce.delete(m[2]);
        s.write(body.subarray(0, drop - start), () => setTimeout(() => q.socket.destroy(), 30));
        return;
      }
      return s.end(body);
    }
    s.writeHead(404); s.end();
  }
}

/** A stand-in for the launcher's game runtime: records how it was started, then exits. */
const FAKE_GAME = path.join(__dirname, 'fixtures', 'fake-game.js');
function webRuntime(info) { return { command: process.execPath, args: [FAKE_GAME, info.executable, ...info.args] }; }

function waitFor(emitter, pred, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { emitter.off('state', on); reject(new Error(`timed out waiting; last state ${JSON.stringify(emitter.state && { phase: emitter.state.phase, message: emitter.state.message, error: emitter.state.error })}`)); }, ms);
    const on = (st) => { if (pred(st)) { clearTimeout(t); emitter.off('state', on); resolve(st); } };
    emitter.on('state', on);
    if (emitter.state && pred(emitter.state)) on(emitter.state);
  });
}

module.exports = { tmpDir, makePackage, FakeGitHub, webRuntime, FAKE_GAME, waitFor };
