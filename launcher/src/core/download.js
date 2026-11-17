'use strict';
/**
 * Resumable, verified downloads.
 *
 * Bytes go to "<file>.part". A small "<file>.part.json" remembers which URL, size and checksum the partial file
 * belongs to, so an interrupted download continues with an HTTP Range request the next time instead of starting
 * over. The finished file is only renamed into place after its size and SHA-256 match the release manifest; a file
 * that does not match is deleted so the next attempt starts clean.
 */
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { LauncherError } = require('./errors');
const { networkError } = require('./github');

async function hashFile(file, hash = crypto.createHash('sha256')) {
  await new Promise((resolve, reject) => {
    fs.createReadStream(file).on('data', (c) => hash.update(c)).on('error', reject).on('end', resolve);
  });
  return hash;
}

async function sha256File(file) { return (await hashFile(file)).digest('hex'); }

async function readMeta(f) { try { return JSON.parse(await fsp.readFile(f, 'utf8')); } catch { return null; } }
async function size(f) { try { return (await fsp.stat(f)).size; } catch { return -1; } }
async function rmf(f) { await fsp.rm(f, { force: true }); }

/** Rolling download speed over the last few seconds. */
class Speed {
  constructor(windowMs = 3000) { this.w = windowMs; this.s = []; }
  add(bytes, t = Date.now()) { this.s.push([t, bytes]); while (this.s.length > 2 && t - this.s[0][0] > this.w) this.s.shift(); }
  get(t = Date.now()) {
    if (this.s.length < 2) return 0;
    const [t0] = this.s[0], dt = (t - t0) / 1000;
    const total = this.s.slice(1).reduce((a, [, b]) => a + b, 0);
    return dt > 0.25 ? total / dt : 0;
  }
}

/**
 * @param {object} o
 * @param {Function} o.fetch
 * @param {string} o.url
 * @param {string} o.dest            final path of the verified file
 * @param {number} o.size            expected bytes
 * @param {string} o.sha256          expected lowercase hex digest
 * @param {(p:{received:number,total:number,speed:number,resumed:boolean})=>void} [o.onProgress]
 * @param {AbortSignal} [o.signal]
 * @param {number} [o.stallTimeoutMs]
 * @param {string} [o.userAgent]
 */
async function download(o) {
  const { url, dest, size: total, sha256 } = o;
  const part = `${dest}.part`, metaFile = `${part}.json`;
  const meta = { url, size: total, sha256 };

  // A complete, verified file from an earlier attempt can be used as is.
  if ((await size(dest)) === total && (await sha256File(dest)) === sha256) return { path: dest, reused: true };
  await rmf(dest);

  let have = await size(part);
  const old = await readMeta(metaFile);
  if (have >= 0 && !(old && old.sha256 === sha256 && old.size === total)) { await rmf(part); have = -1; }
  if (have > total) { await rmf(part); have = -1; }
  await fsp.writeFile(metaFile, JSON.stringify(meta));

  const hash = crypto.createHash('sha256');
  if (have > 0) await hashFile(part, hash); else have = 0;

  if (have < total) {
    const ctl = new AbortController();
    const onAbort = () => ctl.abort(o.signal.reason);
    if (o.signal) { if (o.signal.aborted) onAbort(); else o.signal.addEventListener('abort', onAbort, { once: true }); }
    const headers = { 'User-Agent': o.userAgent || 'AshenDescentLauncher', Accept: 'application/octet-stream' };
    if (have > 0) headers.Range = `bytes=${have}-`;
    let res;
    let stall;
    const armStall = () => { clearTimeout(stall); stall = setTimeout(() => ctl.abort(new Error('stalled')), o.stallTimeoutMs || 30000); };
    try {
      armStall();
      try { res = await o.fetch(url, { headers, redirect: 'follow', signal: ctl.signal }); } catch (e) {
        if (o.signal && o.signal.aborted) throw new LauncherError('aborted', 'The download was cancelled.');
        throw networkError(e, 'The download');
      }
      let append = false;
      if (res.status === 206 && have > 0) {
        const cr = res.headers.get('content-range') || '';
        const m = /bytes (\d+)-(\d+)\/(\d+|\*)/.exec(cr);
        if (m && Number(m[1]) === have) append = true;
        else { try { await res.body?.cancel(); } catch {} await rmf(part); throw new LauncherError('network', 'The server resumed the download from the wrong place.', { detail: 'Retry to download it again from the start.' }); }
      } else if (res.status === 416 && have > 0) {
        await rmf(part);
        throw new LauncherError('network', 'The partial download no longer matches the server.', { detail: 'Retry to download it again from the start.' });
      } else if (res.status !== 200) {
        try { await res.body?.cancel(); } catch {}
        if (res.status === 404) throw new LauncherError('not-found', 'The game package is missing from the release.', { retryable: false });
        if (res.status === 403 || res.status === 429) throw new LauncherError('rate-limit', `The download was refused (HTTP ${res.status}).`, { detail: 'Try again in a little while.' });
        throw new LauncherError('http', `The download failed (HTTP ${res.status}).`);
      }
      if (!append) have = 0; // the server ignored the Range request: start again from byte 0
      const h = append ? hash : crypto.createHash('sha256');
      const out = fs.createWriteStream(part, { flags: append ? 'a' : 'w' });
      const outDone = new Promise((resolve, reject) => { out.on('error', reject); out.on('close', resolve); });
      const speed = new Speed();
      let received = have, last = 0;
      const emit = (force) => {
        const t = Date.now();
        if (!force && t - last < 120) return;
        last = t;
        o.onProgress && o.onProgress({ received, total, speed: speed.get(t), resumed: append });
      };
      emit(true);
      try {
        for await (const chunk of res.body) {
          const b = Buffer.from(chunk);
          received += b.length;
          if (received > total) throw new LauncherError('integrity', 'The download is larger than the release says it should be.', { detail: 'The file on the server may have been replaced. Retry, or wait for a fixed release.' });
          h.update(b);
          speed.add(b.length);
          armStall();
          if (!out.write(b)) await new Promise((r) => out.once('drain', r));
          emit(false);
        }
      } catch (e) {
        out.end(); await outDone.catch(() => {});
        if (e instanceof LauncherError) { if (e.kind === 'integrity') { await rmf(part); await rmf(metaFile); } throw e; }
        if (o.signal && o.signal.aborted) throw new LauncherError('aborted', 'The download was cancelled.');
        throw networkError(e, 'The download');
      }
      out.end();
      await outDone;
      emit(true);
      if (received !== total) throw new LauncherError('network', `The download stopped early (${received} of ${total} bytes).`, { detail: 'Retry to continue where it left off.' });
      const digest = h.digest('hex');
      if (digest !== sha256) {
        await rmf(part); await rmf(metaFile);
        throw new LauncherError('integrity', 'The downloaded package failed its checksum.', { detail: 'It was deleted. Retry to download it again.' });
      }
    } finally {
      clearTimeout(stall);
      if (o.signal) o.signal.removeEventListener('abort', onAbort);
    }
  } else {
    // The partial file already has every byte: just check it.
    if (hash.digest('hex') !== sha256) {
      await rmf(part); await rmf(metaFile);
      throw new LauncherError('integrity', 'The downloaded package failed its checksum.', { detail: 'It was deleted. Retry to download it again.' });
    }
    o.onProgress && o.onProgress({ received: total, total, speed: 0, resumed: true });
  }
  await fsp.rename(part, dest);
  await rmf(metaFile);
  return { path: dest, reused: false };
}

module.exports = { download, sha256File, Speed };
