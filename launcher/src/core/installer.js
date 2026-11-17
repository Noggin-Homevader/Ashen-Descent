'use strict';
/**
 * Clean, recoverable installs and updates.
 *
 * Folder layout under the data root (see docs/LAUNCHER.md):
 *
 *   game/                      managed by this installer, marked with .ashen-managed
 *     versions/<version>/      one complete copy of the game + .ashen-receipt.json (file list with SHA-256)
 *     staging/                 packages are unpacked here first
 *     downloads/               packages and resumable .part files
 *     current.json             which version folder is live; replaced atomically
 *     install-journal.json     present only while an install is in progress
 *   userdata/                  saves, settings, screenshots, mods. The installer never writes or deletes here.
 *   launcher/                  launcher settings, cache and logs
 *
 * An update unpacks the new version into staging, checks it, moves it into versions/, then flips current.json in
 * one atomic rename. Only after that are the old version's files removed, so an install that fails or is
 * interrupted at any point leaves the previous version playable. The journal records how far an install got so
 * the next start can finish or undo it.
 *
 * Deletion is limited to entries inside game/versions, game/staging and game/downloads that this installer
 * created. The data root itself, userdata/ and anything unrecognised are never removed.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const semver = require('./semver');
const { extractZip } = require('./zip');
const { sha256File } = require('./download');
const { resolveInside, isStrictlyInside, safeRelative } = require('./paths');
const { LauncherError } = require('./errors');

const MARKER = '.ashen-managed';
const RECEIPT = '.ashen-receipt.json';

function layout(root) {
  const game = path.join(root, 'game');
  const userdata = path.join(root, 'userdata');
  return {
    root, game, userdata,
    versions: path.join(game, 'versions'),
    staging: path.join(game, 'staging'),
    downloads: path.join(game, 'downloads'),
    current: path.join(game, 'current.json'),
    journal: path.join(game, 'install-journal.json'),
    lock: path.join(game, 'install.lock'),
    gamePid: path.join(game, 'game-process.json'),
    marker: path.join(game, MARKER),
    profile: path.join(userdata, 'profile'),
    screenshots: path.join(userdata, 'screenshots'),
    mods: path.join(userdata, 'mods'),
    launcher: path.join(root, 'launcher'),
  };
}

async function exists(p) { try { await fsp.lstat(p); return true; } catch { return false; } }
async function readJson(p) { try { return JSON.parse(await fsp.readFile(p, 'utf8')); } catch { return null; } }
async function writeJsonAtomic(file, obj) {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  const fh = await fsp.open(tmp, 'w');
  try { await fh.writeFile(JSON.stringify(obj, null, 2)); await fh.sync(); } finally { await fh.close(); }
  await fsp.rename(tmp, file);
}
const rand = () => crypto.randomBytes(4).toString('hex');
const isPreserved = (rel, preserve) => preserve.some((p) => (p.endsWith('/') ? rel.startsWith(p) || `${rel}/` === p : rel === p || rel.startsWith(`${p}/`)));

class Installer {
  /**
   * @param {string} root  data root (the launcher's own data folder)
   * @param {object} [opts]
   * @param {{phase?:(name:string, info:object)=>any}} [opts.hooks] called between steps (tests use it to simulate crashes)
   * @param {(msg:string)=>void} [opts.log]
   */
  constructor(root, { hooks = {}, log = () => {} } = {}) {
    if (!root || !path.isAbsolute(root)) throw new LauncherError('config', 'The install root must be an absolute path.', { retryable: false });
    this.L = layout(root); this.hooks = hooks; this.log = log;
  }

  async init() {
    const L = this.L;
    await fsp.mkdir(L.root, { recursive: true });
    if (!(await exists(L.marker))) {
      if (await exists(L.game)) {
        const entries = await fsp.readdir(L.game);
        if (entries.length) {
          throw new LauncherError('config', `${L.game} already exists and was not created by the launcher.`, {
            detail: 'Move it aside so the launcher does not overwrite it.', retryable: false,
          });
        }
      }
      await fsp.mkdir(L.game, { recursive: true });
      await fsp.writeFile(L.marker, JSON.stringify({ managedBy: 'ashen-descent-launcher', createdAt: new Date().toISOString() }));
    }
    for (const d of [L.versions, L.staging, L.downloads, L.userdata, L.profile, L.screenshots, L.mods, L.launcher]) await fsp.mkdir(d, { recursive: true });
  }

  async _phase(name, info) { if (this.hooks.phase) await this.hooks.phase(name, info); }

  /** Remove something the installer owns. Refuses anything outside versions/, staging/ or downloads/. */
  async _rm(p) {
    const L = this.L;
    if (!(await exists(L.marker))) throw new LauncherError('install', 'Refusing to delete files: the game folder is not marked as launcher-managed.', { retryable: false });
    if (![L.versions, L.staging, L.downloads].some((d) => isStrictlyInside(d, p))) {
      throw new LauncherError('install', `Refusing to delete ${p}: it is outside the launcher's managed folders.`, { retryable: false });
    }
    await fsp.rm(p, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  }

  async readCurrent() {
    const c = await readJson(this.L.current);
    if (!c || typeof c !== 'object' || !semver.valid(c.version) || typeof c.dir !== 'string') return null;
    if (!/^[\w.+-]+$/.test(c.dir)) return null;
    return { version: semver.parse(c.version).raw, dir: c.dir, installedAt: c.installedAt || null, abs: path.join(this.L.versions, c.dir) };
  }

  /**
   * Check an installed version folder against its receipt.
   * quick: every file exists with the recorded size. deep: every file's SHA-256 matches as well.
   */
  async verifyDir(abs, { deep = false } = {}) {
    const problems = [];
    const receipt = await readJson(path.join(abs, RECEIPT));
    if (!receipt || !Array.isArray(receipt.files) || !receipt.build) return { ok: false, problems: ['install record is missing'] };
    for (const f of receipt.files) {
      let full;
      try { full = resolveInside(abs, safeRelative(f.path, 'file')); } catch { problems.push(`bad entry ${f.path}`); continue; }
      let st;
      try { st = await fsp.stat(full); } catch { problems.push(`missing ${f.path}`); if (problems.length > 20) break; continue; }
      if (!st.isFile() || st.size !== f.size) { problems.push(`changed ${f.path}`); continue; }
      if (deep && (await sha256File(full)) !== f.sha256) problems.push(`damaged ${f.path}`);
    }
    for (const r of receipt.build.requiredFiles || [receipt.build.executable]) {
      try { const st = await fsp.stat(resolveInside(abs, r)); if (!st.isFile()) problems.push(`required ${r} is not a file`); } catch { problems.push(`required ${r} is missing`); }
    }
    return { ok: problems.length === 0, problems, receipt };
  }

  /** The live installation, checked. Resolves to { ok, version, dir, receipt, problems } or null when nothing is installed. */
  async verifyCurrent({ deep = false } = {}) {
    let cur = await this.readCurrent();
    if (!cur) cur = await this._relinkOrphan();
    if (!cur) return null;
    const v = await this.verifyDir(cur.abs, { deep });
    return { ...v, version: cur.version, dir: cur.dir, abs: cur.abs };
  }

  /** current.json lost or unreadable, but a complete version folder is there: point at the newest one. */
  async _relinkOrphan() {
    let names = [];
    try { names = await fsp.readdir(this.L.versions); } catch { return null; }
    const good = [];
    for (const n of names) {
      const abs = path.join(this.L.versions, n);
      const r = await readJson(path.join(abs, RECEIPT));
      if (!r || !semver.valid(r.version) || semver.folderName(r.version) !== n) continue;
      if ((await this.verifyDir(abs)).ok) good.push({ version: semver.parse(r.version).raw, dir: n, abs });
    }
    if (!good.length || (await exists(this.L.journal))) return null;
    good.sort((a, b) => semver.compare(b.version, a.version));
    await writeJsonAtomic(this.L.current, { schema: 1, version: good[0].version, dir: good[0].dir, installedAt: new Date().toISOString(), relinked: true });
    this.log(`relinked current.json to ${good[0].dir}`);
    return { ...good[0], installedAt: null };
  }

  /** Executable, arguments, working folder and runtime of the live installation. */
  async launchInfo() {
    const v = await this.verifyCurrent();
    if (!v || !v.ok) return null;
    const b = v.receipt.build;
    return { version: v.version, cwd: v.abs, executable: resolveInside(v.abs, b.executable), args: b.args || [], runtime: b.runtime || 'native' };
  }

  /**
   * Install a downloaded, checksum-verified package as the live version.
   * @param {{version:string, archive:string, build:object, onProgress?:Function}} o
   */
  async install({ version, archive, build, onProgress }) {
    const L = this.L;
    await this.init();
    if (await exists(L.journal)) await this.recover();
    const prev = await this.readCurrent();
    const name = semver.folderName(version);
    const target = path.join(L.versions, name);
    const staging = path.join(L.staging, `${name}-${rand()}`);
    const journal = {
      schema: 1, op: 'install', version, phase: 'staging',
      staging: path.basename(staging), target: name, previous: prev ? prev.dir : null, displaced: null,
      startedAt: new Date().toISOString(),
    };
    await writeJsonAtomic(L.journal, journal);
    try {
      const files = await extractZip(archive, staging, { onProgress });
      await this._phase('extracted', { staging });

      journal.phase = 'verifying'; await writeJsonAtomic(L.journal, journal);
      for (const r of build.requiredFiles || [build.executable]) {
        let st = null;
        try { st = await fsp.stat(resolveInside(staging, r)); } catch {}
        if (!st || !st.isFile()) throw new LauncherError('archive', `The package is missing ${r}.`, { retryable: false, detail: 'This release is incomplete. Report it to the developers.' });
      }
      const preserve = Array.from(new Set([...(build.preserve || []), ...((prev && (await this._receiptBuild(prev.abs)) || {}).preserve || [])]));
      if (prev && preserve.length) await this._carryUserFiles(prev.abs, staging, preserve);
      await writeJsonAtomic(path.join(staging, RECEIPT), {
        schema: 1, version, installedAt: new Date().toISOString(),
        build: { os: build.os, arch: build.arch, runtime: build.runtime || 'native', file: build.file, sha256: build.sha256, executable: build.executable, args: build.args || [], requiredFiles: build.requiredFiles || [build.executable], preserve: build.preserve || [] },
        files: files.filter((f) => !isPreserved(f.path, preserve)),
      });
      await this._phase('verified', { staging });

      journal.phase = 'committing'; await writeJsonAtomic(L.journal, journal);
      if (await exists(target)) {
        // Reinstalling (repairing) the same version: keep the old copy aside until the switch has happened.
        const displaced = `${name}.displaced-${rand()}`;
        await fsp.rename(target, path.join(L.versions, displaced));
        journal.displaced = displaced; await writeJsonAtomic(L.journal, journal);
      }
      await this._phase('before-switch', { target });
      await fsp.rename(staging, target);
      await this._phase('moved', { target });
      await writeJsonAtomic(L.current, { schema: 1, version, dir: name, installedAt: new Date().toISOString() });
      await this._phase('switched', { target });
    } catch (e) {
      await this._undo(journal).catch((u) => this.log(`undo failed: ${u.message}`));
      if (e instanceof LauncherError) throw e;
      throw new LauncherError('install', `Installing version ${version} failed: ${e.message}`, { cause: e, detail: 'Your previous version was kept.' });
    }
    journal.phase = 'cleanup'; await writeJsonAtomic(L.journal, journal);
    await this._cleanup(name);
    await this._phase('cleaned', {});
    await fsp.rm(L.journal, { force: true });
    return { version, dir: name };
  }

  async _receiptBuild(abs) { const r = await readJson(path.join(abs, RECEIPT)); return r && r.build; }

  /** Copy player files that live inside the old install folder (declared in the manifest's "preserve") into the new one. */
  async _carryUserFiles(fromDir, toDir, preserve) {
    for (const p of preserve) {
      const rel = p.replace(/\/$/, '');
      const src = resolveInside(fromDir, rel), dst = resolveInside(toDir, rel);
      if (!(await exists(src))) continue;
      await fsp.rm(dst, { recursive: true, force: true });
      await fsp.mkdir(path.dirname(dst), { recursive: true });
      await fsp.cp(src, dst, { recursive: true, force: true, errorOnExist: false, verbatimSymlinks: true });
      this.log(`kept player files: ${rel}`);
    }
  }

  /** Put things back the way they were before an install started. */
  async _undo(j) {
    const L = this.L;
    if (j.staging) await this._rm(path.join(L.staging, j.staging));
    const cur = await this.readCurrent();
    // When repairing the same version, current.json already names the target folder before and after the
    // switch, so it says nothing about progress; the displaced copy is what matters then.
    const repair = j.previous === j.target;
    const switched = !repair && cur && cur.dir === j.target && cur.version === j.version;
    if (!switched) {
      // The new folder may have been moved into place before the switch; remove it unless it is the old copy.
      if (j.displaced || j.target !== j.previous) {
        if (await exists(path.join(L.versions, j.target)) && (await this._isOurs(j.target))) await this._rm(path.join(L.versions, j.target));
      }
      if (j.displaced && (await exists(path.join(L.versions, j.displaced)))) {
        await fsp.rename(path.join(L.versions, j.displaced), path.join(L.versions, j.target));
      }
      if (j.previous && !(await this.readCurrent())) {
        const prevAbs = path.join(L.versions, j.previous);
        const r = await readJson(path.join(prevAbs, RECEIPT));
        if (r && semver.valid(r.version)) await writeJsonAtomic(L.current, { schema: 1, version: r.version, dir: j.previous, installedAt: new Date().toISOString(), restored: true });
      }
    }
    await fsp.rm(L.journal, { force: true });
  }

  async _isOurs(name) {
    if (/\.displaced-[0-9a-f]{8}$/.test(name)) return true;
    if (await exists(path.join(this.L.versions, name, RECEIPT))) return true;
    return semver.valid(name.replace(/_/g, '+'));
  }

  /** After a successful switch: delete every other version folder, staging leftovers and finished downloads. */
  async _cleanup(keep) {
    const L = this.L;
    for (const n of await fsp.readdir(L.versions).catch(() => [])) {
      if (n === keep) continue;
      if (await this._isOurs(n)) await this._rm(path.join(L.versions, n));
      else this.log(`left unrecognised entry in versions/: ${n}`);
    }
    for (const n of await fsp.readdir(L.staging).catch(() => [])) {
      if (/-[0-9a-f]{8}$/.test(n)) await this._rm(path.join(L.staging, n));
    }
    for (const n of await fsp.readdir(L.downloads).catch(() => [])) {
      if (/\.zip(\.part(\.json)?)?$/i.test(n)) await this._rm(path.join(L.downloads, n));
    }
  }

  /**
   * Finish or undo an install that was interrupted (power loss, crash, the launcher being killed).
   * Resolves to null when there was nothing to do, otherwise { action: 'completed'|'rolled-back', version }.
   */
  async recover() {
    const L = this.L;
    if (!(await exists(L.marker))) return null;
    const j = await readJson(L.journal);
    if (!j) {
      if (await exists(L.journal)) await fsp.rm(L.journal, { force: true }); // unreadable journal: nothing was switched yet
      for (const n of await fsp.readdir(L.staging).catch(() => [])) if (/-[0-9a-f]{8}$/.test(n)) await this._rm(path.join(L.staging, n));
      return null;
    }
    const cur = await this.readCurrent();
    if (cur && cur.version === j.version && cur.dir === j.target && (await this.verifyDir(cur.abs)).ok) {
      await writeJsonAtomic(L.journal, { ...j, phase: 'cleanup' });
      await this._cleanup(j.target);
      await fsp.rm(L.journal, { force: true });
      this.log(`recovered: finished installing ${j.version}`);
      return { action: 'completed', version: j.version };
    }
    await this._undo(j);
    this.log(`recovered: undid the unfinished install of ${j.version}`);
    return { action: 'rolled-back', version: j.version };
  }

  /** Where a package for `version` is downloaded to. */
  archivePath(file) { return path.join(this.L.downloads, path.basename(file)); }
}

module.exports = { Installer, layout, RECEIPT, MARKER, writeJsonAtomic };
