'use strict';
/**
 * A small, strict ZIP reader and writer built on Node's zlib, so the launcher has no third-party code in its
 * update path.
 *
 * Reading is deliberately unforgiving: every entry name is validated before anything is written (no absolute
 * paths, no "..", no drive letters, no symbolic links, no duplicate names), each file is created fresh inside the
 * destination folder, and each file's size and CRC-32 are checked against the archive's directory. Encrypted
 * entries, multi-disk archives and ZIP64 are refused; release packages never need them.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const { safeRelative, resolveInside } = require('./paths');
const { LauncherError } = require('./errors');

/* ---------- CRC-32 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf, prev = 0) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf, prev) >>> 0;
  let c = (prev ^ 0xffffffff) >>> 0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const SIG_LOCAL = 0x04034b50, SIG_CENTRAL = 0x02014b50, SIG_END = 0x06054b50, SIG_Z64_LOC = 0x07064b50;
const bad = (m) => new LauncherError('archive', m, { retryable: false, detail: 'The package will be downloaded again on retry.' });

/* ---------- reading ---------- */
async function readAt(fh, pos, len) {
  const b = Buffer.alloc(len);
  const { bytesRead } = await fh.read(b, 0, len, pos);
  if (bytesRead !== len) throw bad('The package ends unexpectedly.');
  return b;
}

/** List the entries of an archive without extracting. */
async function listEntries(file, { maxEntries = 200000 } = {}) {
  const fh = await fsp.open(file, 'r');
  try {
    const { size } = await fh.stat();
    if (size < 22) throw bad('The package is too small to be a ZIP archive.');
    const tailLen = Math.min(size, 22 + 0xffff);
    const tail = await readAt(fh, size - tailLen, tailLen);
    let e = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === SIG_END) { e = i; break; }
    if (e < 0) throw bad('The package is not a ZIP archive (no directory found).');
    if (e >= 20 && tail.readUInt32LE(e - 20) === SIG_Z64_LOC) throw bad('ZIP64 packages are not supported.');
    const disk = tail.readUInt16LE(e + 4), cdDisk = tail.readUInt16LE(e + 6);
    const count = tail.readUInt16LE(e + 10), cdSize = tail.readUInt32LE(e + 12), cdOff = tail.readUInt32LE(e + 16);
    if (disk !== 0 || cdDisk !== 0) throw bad('Multi-part ZIP packages are not supported.');
    if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) throw bad('ZIP64 packages are not supported.');
    if (count > maxEntries) throw bad('The package has too many files.');
    const endPos = size - tailLen + e;
    if (cdOff + cdSize > endPos) throw bad('The package directory is damaged.');
    const cd = await readAt(fh, cdOff, cdSize);
    const entries = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (p + 46 > cd.length || cd.readUInt32LE(p) !== SIG_CENTRAL) throw bad('The package directory is damaged.');
      const madeBy = cd.readUInt16LE(p + 4), flags = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10);
      const crc = cd.readUInt32LE(p + 16), csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
      const nlen = cd.readUInt16LE(p + 28), xlen = cd.readUInt16LE(p + 30), clen = cd.readUInt16LE(p + 32);
      const ext = cd.readUInt32LE(p + 38), lho = cd.readUInt32LE(p + 42);
      if (p + 46 + nlen + xlen + clen > cd.length) throw bad('The package directory is damaged.');
      const rawName = cd.subarray(p + 46, p + 46 + nlen);
      const name = (flags & 0x800) ? rawName.toString('utf8') : rawName.toString('latin1');
      p += 46 + nlen + xlen + clen;
      if (flags & 0x1) throw bad(`"${name}" is encrypted.`);
      if (csize === 0xffffffff || usize === 0xffffffff || lho === 0xffffffff) throw bad('ZIP64 packages are not supported.');
      const unixMode = (madeBy >> 8) === 3 ? (ext >>> 16) : 0;
      const isLink = (unixMode & 0o170000) === 0o120000;
      const isDir = name.endsWith('/') || name.endsWith('\\') || (unixMode & 0o170000) === 0o040000 || (ext & 0x10) !== 0;
      if (!isDir && method !== 0 && method !== 8) throw bad(`"${name}" uses an unsupported compression method (${method}).`);
      if (lho >= cdOff) throw bad('The package directory is damaged.');
      entries.push({ name, method, crc, csize, usize, lho, isDir, isLink, exec: (unixMode & 0o111) !== 0 });
    }
    return { entries, cdOff };
  } finally { await fh.close(); }
}

class Check extends Transform {
  constructor(expectSize, expectCrc, name, onBytes) {
    super(); this.n = 0; this.crc = 0; this.es = expectSize; this.ec = expectCrc; this.nm = name; this.onBytes = onBytes;
    this.hash = crypto.createHash('sha256');
  }
  _transform(c, _e, cb) {
    this.n += c.length;
    if (this.n > this.es) return cb(bad(`"${this.nm}" is larger than the package says.`));
    this.crc = crc32(c, this.crc); this.hash.update(c); this.onBytes && this.onBytes(c.length); cb(null, c);
  }
  _flush(cb) {
    if (this.n !== this.es) return cb(bad(`"${this.nm}" is shorter than the package says.`));
    if (this.crc !== this.ec) return cb(bad(`"${this.nm}" is damaged (CRC mismatch).`));
    cb();
  }
}

/**
 * Extract `file` into the folder `dest`, which must be empty or missing. Returns the list of extracted files
 * with their sizes and SHA-256 digests.
 */
async function extractZip(file, dest, { onProgress, maxTotalBytes = 16 * 1024 ** 3, maxEntries } = {}) {
  const { entries, cdOff } = await listEntries(file, { maxEntries });
  // Validate everything before writing anything.
  const seen = new Set();
  let total = 0;
  const plan = [];
  for (const e of entries) {
    if (e.isLink) throw bad(`"${e.name}" is a symbolic link, which packages may not contain.`);
    const rel = safeRelative(e.name, 'archive entry', { allowDirSuffix: true });
    const key = rel.toLowerCase();
    if (!e.isDir) {
      if (seen.has(key)) throw bad(`"${rel}" appears twice in the package.`);
      seen.add(key);
      total += e.usize;
      if (total > maxTotalBytes) throw bad('The package unpacks to more data than allowed.');
    }
    plan.push({ e, rel, abs: resolveInside(dest, rel) });
  }
  // A file and a folder with the same name would collide.
  for (const { e, rel } of plan) {
    if (e.isDir) continue;
    const parts = rel.toLowerCase().split('/');
    for (let i = 1; i < parts.length; i++) if (seen.has(parts.slice(0, i).join('/'))) throw bad(`"${rel}" is inside a path that is also a file.`);
  }
  await fsp.mkdir(dest, { recursive: true });
  if ((await fsp.readdir(dest)).length) throw new LauncherError('install', 'The staging folder is not empty.');

  const files = [];
  let done = 0;
  const report = () => onProgress && onProgress({ done, total });
  const fh = await fsp.open(file, 'r');
  try {
    for (const { e, rel, abs } of plan) {
      if (e.isDir) { await fsp.mkdir(abs, { recursive: true }); continue; }
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      const lh = await readAt(fh, e.lho, 30);
      if (lh.readUInt32LE(0) !== SIG_LOCAL) throw bad(`"${rel}" has a damaged header.`);
      const start = e.lho + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
      if (start + e.csize > cdOff) throw bad(`"${rel}" runs past the end of the package data.`);
      const check = new Check(e.usize, e.crc, rel, (n) => { done += n; report(); });
      const src = e.csize === 0
        ? require('stream').Readable.from([])
        : fs.createReadStream(file, { start, end: start + e.csize - 1 });
      const stages = [src];
      if (e.method === 8) stages.push(zlib.createInflateRaw());
      stages.push(check);
      // 'wx' never follows or overwrites an existing file or link.
      stages.push(fs.createWriteStream(abs, { flags: 'wx', mode: e.exec ? 0o755 : 0o644 }));
      try { await pipeline(...stages); } catch (err) {
        if (err instanceof LauncherError) throw err;
        if (err && err.code === 'EEXIST') throw bad(`"${rel}" appears twice in the package.`);
        if (err && (err.code === 'ENOSPC' || err.code === 'EACCES' || err.code === 'EPERM')) {
          throw new LauncherError('install', `Could not write "${rel}" (${err.code}).`, { detail: err.code === 'ENOSPC' ? 'The disk is full.' : 'Check folder permissions or antivirus software.' });
        }
        throw bad(`"${rel}" could not be unpacked: ${err.message}`);
      }
      files.push({ path: rel, size: e.usize, sha256: check.hash.digest('hex') });
    }
  } finally { await fh.close(); }
  return files;
}

/* ---------- writing (used by the packaging script and tests) ---------- */
function dosTime(d) {
  const t = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const day = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { t, day };
}

/**
 * Write a ZIP archive. `entries` are { name, data?: Buffer, file?: string, mode?: number }.
 * Entries are written in the given order with a fixed timestamp so the same input gives the same bytes.
 * `raw: true` skips name validation (tests use it to build hostile archives).
 */
function writeZip(out, entries, { mtime = new Date(1980, 0, 1, 0, 0, 0), raw = false } = {}) {
  const { t, day } = dosTime(mtime);
  const chunks = [], central = [];
  let off = 0;
  for (const en of entries) {
    const name = raw ? en.name : safeRelative(en.name, 'archive entry', { allowDirSuffix: true }) + (en.name.endsWith('/') ? '/' : '');
    const nameBuf = Buffer.from(name, 'utf8');
    const isDir = name.endsWith('/');
    const data = isDir ? Buffer.alloc(0) : (en.data != null ? Buffer.from(en.data) : fs.readFileSync(en.file));
    const crc = crc32(data);
    let comp = isDir ? data : zlib.deflateRawSync(data, { level: 9 });
    let method = 8;
    if (isDir || comp.length >= data.length) { comp = data; method = 0; }
    if (en.storeAs != null) { method = en.storeAs; comp = method === 8 ? zlib.deflateRawSync(data) : data; }
    if (off > 0xfffffff0 || comp.length > 0xfffffff0) throw new Error('Package too large for a non-ZIP64 archive.');
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(SIG_LOCAL, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(t, 10); lh.writeUInt16LE(day, 12); lh.writeUInt32LE(en.crcOverride ?? crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(en.usizeOverride ?? data.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    const mode = en.mode != null ? en.mode : isDir ? 0o040755 : 0o100644;
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(SIG_CENTRAL, 0); ch.writeUInt16LE((3 << 8) | 20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(t, 12); ch.writeUInt16LE(day, 14); ch.writeUInt32LE(en.crcOverride ?? crc, 16); ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(en.usizeOverride ?? data.length, 24); ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(((mode & 0xffff) << 16 | (isDir ? 0x10 : 0)) >>> 0, 38); ch.writeUInt32LE(off, 42);
    chunks.push(lh, nameBuf, comp);
    central.push(ch, nameBuf);
    off += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  const buf = Buffer.concat([...chunks, cd, end]);
  if (out) fs.writeFileSync(out, buf);
  return buf;
}

module.exports = { extractZip, listEntries, writeZip, crc32 };
