'use strict';
/**
 * The launcher updating itself.
 *
 * Launcher releases are tagged "launcher-vX.Y.Z" and carry launcher-manifest.json (written by
 * tools/launcher-manifest.js in the Launcher build workflow): the version and, per platform and install kind, the
 * file name, size and SHA-256. The launcher reads the same release list it reads for game updates, downloads the
 * right file with the same resumable, checksum-verified download, and replaces itself in the way that suits how it
 * was installed:
 *
 *   nsis      installed by AshenDescent-Setup.exe: the new setup runs silently into the same folder and restarts
 *             the launcher (/S --updated --force-run).
 *   zip       installed by AshenDescent-Install.cmd or unzipped by hand: the new zip is unpacked next to the program
 *             folder, and a small script swaps the folders once the launcher has closed, then starts it again.
 *             If the swap fails the old folder is put back.
 *   appimage  Linux: the AppImage file is replaced and started again.
 *   dmg       macOS: unsigned apps cannot replace themselves safely, so the player is told and offered the download.
 *   dev       running from source (npm start): never updates.
 *
 * Nothing is replaced while the game is running: the game runs from the launcher's own program file.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const semver = require('./semver');
const { download } = require('./download');
const { extractZip } = require('./zip');
const { LauncherError } = require('./errors');

const TAG_PREFIX = 'launcher-v';
const MANIFEST = 'launcher-manifest.json';
const KINDS = ['nsis', 'zip', 'appimage', 'dmg'];
const EXE = 'Ashen Descent.exe';

/** How this copy of the launcher was installed. */
function detectInstallKind({ platform = process.platform, execPath = process.execPath, env = process.env, defaultApp = !!process.defaultApp, exists = fs.existsSync } = {}) {
  if (defaultApp) return 'dev';
  if (platform === 'win32') return exists(path.join(path.dirname(execPath), 'Uninstall Ashen Descent.exe')) ? 'nsis' : 'zip';
  if (platform === 'linux') return env.APPIMAGE ? 'appimage' : 'dev';
  if (platform === 'darwin') return 'dmg';
  return 'dev';
}

function validateLauncherManifest(m, tagVersion) {
  const bad = (msg) => new LauncherError('manifest', `Launcher release information is invalid: ${msg}`, { retryable: false });
  if (!m || m.schema !== 1 || m.name !== 'ashen-descent-launcher') throw bad('not a launcher manifest');
  if (!semver.valid(m.version) || semver.compare(m.version, tagVersion) !== 0) throw bad('version does not match the tag');
  if (!Array.isArray(m.builds) || !m.builds.length) throw bad('no builds');
  return {
    version: semver.parse(m.version).raw,
    builds: m.builds.map((b) => {
      if (!b || !KINDS.includes(b.kind) || typeof b.os !== 'string' || typeof b.arch !== 'string') throw bad('bad build entry');
      if (!/^[\w.+ -]{1,200}$/.test(b.file || '') || !Number.isSafeInteger(b.size) || b.size <= 0 || !/^[a-f0-9]{64}$/.test(b.sha256 || '')) throw bad(`bad file details for ${b.kind}`);
      return { os: b.os, arch: b.arch, kind: b.kind, file: b.file, size: b.size, sha256: b.sha256 };
    }),
  };
}

class SelfUpdater {
  /**
   * @param {object} o
   * @param {import('./github').GitHubClient} o.github
   * @param {Function} o.fetch
   * @param {string} o.currentVersion
   * @param {{os:string,arch:string}} o.platform
   * @param {string} o.kind            from detectInstallKind()
   * @param {string} o.dir             where downloads and the swap script go
   * @param {string} [o.execPath]
   * @param {Function} [o.log]
   */
  constructor(o) { this.o = o; this.log = o.log || (() => {}); }

  get canUpdate() { return this.o.kind !== 'dev'; }

  /** The newest launcher release for this computer that is newer than this one, or null. */
  async check({ allowPrerelease = false } = {}) {
    if (!this.canUpdate) return null;
    const { releases } = await this.o.github.listReleases();
    const cands = [];
    for (const r of releases) {
      if (!r || r.draft || typeof r.tag_name !== 'string' || !r.tag_name.startsWith(TAG_PREFIX)) continue;
      const v = r.tag_name.slice(TAG_PREFIX.length);
      if (!semver.valid(v) || ((r.prerelease || semver.isPrerelease(v)) && !allowPrerelease)) continue;
      if (semver.compare(v, this.o.currentVersion) <= 0) continue;
      cands.push({ r, v });
    }
    cands.sort((a, b) => semver.compare(b.v, a.v));
    for (const { r, v } of cands.slice(0, 5)) {
      const assets = Array.isArray(r.assets) ? r.assets : [];
      const ma = assets.find((a) => a && a.name === MANIFEST);
      if (!ma) { this.log(`launcher ${v}: no ${MANIFEST}, skipped`); continue; }
      let m;
      try { m = validateLauncherManifest(await this.o.github.fetchJsonAsset(ma.browser_download_url), v); } catch (e) {
        if (e.kind === 'network' || e.kind === 'rate-limit') throw e;
        this.log(`launcher ${v}: ${e.message}`); continue;
      }
      const { os, arch } = this.o.platform;
      const want = this.o.kind;
      const build = m.builds.find((b) => b.kind === want && b.os === os && (b.arch === arch || b.arch === 'any'))
        || (os === 'macos' && arch === 'arm64' ? m.builds.find((b) => b.kind === want && b.os === os && b.arch === 'x64') : null);
      if (!build) { this.log(`launcher ${v}: no ${want} build for ${os}/${arch}`); continue; }
      const asset = assets.find((a) => a && a.name === build.file);
      if (!asset || (Number.isFinite(asset.size) && asset.size !== build.size)) { this.log(`launcher ${v}: ${build.file} missing or wrong size`); continue; }
      return { version: m.version, build, url: asset.browser_download_url, notes: typeof r.body === 'string' ? r.body : '', htmlUrl: r.html_url || null, applies: build.kind !== 'dmg' };
    }
    return null;
  }

  /** Download and verify the update; for zip installs, also unpack it beside the program folder. */
  async prepare(info, { onProgress, signal } = {}) {
    await fsp.mkdir(this.o.dir, { recursive: true });
    const dest = path.join(this.o.dir, info.build.file);
    await download({ fetch: this.o.fetch, url: info.url, dest, size: info.build.size, sha256: info.build.sha256, onProgress, signal, userAgent: `AshenDescentLauncher/${this.o.currentVersion}` });
    if (info.build.kind !== 'zip') return { file: dest };
    const appDir = path.dirname(this.o.execPath);
    const staging = `${appDir}.update`;
    await fsp.rm(staging, { recursive: true, force: true });
    await extractZip(dest, staging);
    // The zip may hold the app in a sub-folder; find the folder with the executable.
    const found = await findExe(staging, EXE);
    if (!found) { await fsp.rm(staging, { recursive: true, force: true }); throw new LauncherError('archive', `The launcher update does not contain ${EXE}.`, { retryable: false }); }
    return { file: dest, staging: found };
  }
}

async function findExe(dir, name, depth = 0) {
  if (fs.existsSync(path.join(dir, name))) return dir;
  if (depth > 2) return null;
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { const f = await findExe(path.join(dir, e.name), name, depth + 1); if (f) return f; }
  }
  return null;
}

/**
 * Windows zip installs: the script that swaps the program folders after the launcher exits, then restarts it.
 * Retries while Windows still holds the old files, and puts the old folder back if the swap fails.
 */
function swapScript({ pid, appDir, staging, exe = EXE, start = true }) {
  const q = (s) => String(s).replace(/%/g, '%%');
  return [
    '@echo off',
    'setlocal',
    `set "APP=${q(appDir)}"`,
    `set "NEW=${q(staging)}"`,
    `set "OLD=${q(appDir)}.old"`,
    'set /a N=0',
    ':wait',
    `tasklist /FI "PID eq ${Number(pid) | 0}" 2>nul | find "${Number(pid) | 0}" >nul && (timeout /t 1 /nobreak >nul & goto wait)`,
    'if exist "%OLD%" rmdir /s /q "%OLD%"',
    ':swap',
    'move "%APP%" "%OLD%" >nul 2>&1 && goto moved',
    'set /a N+=1',
    'if %N% GEQ 20 goto fail',
    'timeout /t 1 /nobreak >nul',
    'goto swap',
    ':moved',
    'move "%NEW%" "%APP%" >nul 2>&1 || (move "%OLD%" "%APP%" >nul 2>&1 & goto fail)',
    start ? `start "" "%APP%\\${exe}"` : 'rem (start skipped)',
    'rmdir /s /q "%OLD%" >nul 2>&1',
    '(goto) 2>nul & del "%~f0"',
    ':fail',
    'if exist "%NEW%" rmdir /s /q "%NEW%" >nul 2>&1',
    start ? `start "" "%APP%\\${exe}"` : 'rem (start skipped)',
    'exit /b 1',
    '',
  ].join('\r\n');
}

module.exports = { SelfUpdater, detectInstallKind, validateLauncherManifest, swapScript, TAG_PREFIX, MANIFEST };
