'use strict';
/**
 * Where the game is installed.
 *
 * By default everything lives in <appData>/Ashen Descent (on Windows %APPDATA%\Ashen Descent, on the system drive).
 * Players can choose another drive: the choice is remembered in <appData>/Ashen Descent/location.json, and the data
 * root becomes "<drive>\Ashen Descent" with the usual game/, userdata/ and launcher/ folders inside.
 *
 * Moving an existing installation copies game/, userdata/ (saves) and the launcher's settings to the new place,
 * checks every copied file, switches location.json, and only then removes the old copies.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { LauncherError } = require('./errors');
const { isStrictlyInside } = require('./paths');

const FOLDER = 'Ashen Descent';

function defaultRoot(appData) { return path.join(appData, FOLDER); }
function locationFile(appData) { return path.join(defaultRoot(appData), 'location.json'); }

function readLocation(appData) {
  try {
    const d = JSON.parse(fs.readFileSync(locationFile(appData), 'utf8'));
    if (d && typeof d.dataDir === 'string' && path.isAbsolute(d.dataDir)) return { dataDir: path.normalize(d.dataDir), chosenAt: d.chosenAt || null };
  } catch {}
  return null;
}

function writeLocation(appData, dataDir) {
  const f = locationFile(appData);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ dataDir: path.normalize(dataDir), chosenAt: new Date().toISOString() }, null, 2));
  fs.renameSync(tmp, f);
}

/** The data root to use: ASHEN_DATA_DIR (testing/portable) > the player's choice > the default. */
function resolveRoot(appData, env = process.env) {
  if (env.ASHEN_DATA_DIR) return { root: path.resolve(env.ASHEN_DATA_DIR), source: 'env' };
  const loc = readLocation(appData);
  if (loc) return { root: loc.dataDir, source: 'chosen' };
  return { root: defaultRoot(appData), source: 'default' };
}

/** The data root that goes with a drive: the default folder on the system drive, "<drive>\Ashen Descent" elsewhere. */
function rootForDrive(drive, appData, systemDrive = defaultRoot(appData).slice(0, 2)) {
  const d = drive.replace(/[\\/]+$/, '');
  if (/^[A-Za-z]:$/.test(d) && d.toUpperCase() === systemDrive.toUpperCase()) return defaultRoot(appData);
  return path.join(`${d}${path.sep}`, FOLDER);
}

/** Is a game installed (or partly installed) under this root? */
function hasInstall(root) {
  return fs.existsSync(path.join(root, 'game', 'current.json')) || fs.existsSync(path.join(root, 'game', '.ashen-managed'));
}

/** Windows drives with their free and total space. Other systems: [] (the folder picker is used instead). */
async function listDrives({ platform = process.platform, statfs = fsp.statfs, systemDrive = process.env.SystemDrive || 'C:' } = {}) {
  if (platform !== 'win32' || typeof statfs !== 'function') return [];
  const out = [];
  for (const l of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const p = `${l}:\\`;
    try {
      const s = await Promise.race([statfs(p), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))]);
      const free = Number(s.bavail) * Number(s.bsize), total = Number(s.blocks) * Number(s.bsize);
      if (total > 0) out.push({ path: p, letter: `${l}:`, free, total, system: `${l}:`.toUpperCase() === systemDrive.toUpperCase() });
    } catch { /* no drive, or not ready (empty card reader, disc drive) */ }
  }
  return out;
}

async function freeSpace(dir, statfs = fsp.statfs) {
  let p = path.resolve(dir);
  while (!fs.existsSync(p)) { const up = path.dirname(p); if (up === p) break; p = up; }
  try { const s = await statfs(p); return Number(s.bavail) * Number(s.bsize); } catch { return null; }
}

async function walk(dir, base, out, skip) {
  let ents = [];
  try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (skip(rel.split(path.sep).join('/'))) continue;
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) await walk(full, base, out, skip);
    else if (e.isFile()) out.push({ rel, size: (await fsp.stat(full)).size });
  }
  return out;
}

/** Things that are never copied: Chromium's live profile for the launcher window, and in-progress markers. */
const SKIP = (rel) => rel === 'launcher/electron' || rel.startsWith('launcher/electron/') || rel === 'location.json'
  || /^game\/(install\.lock|game-process\.json)$/.test(rel) || rel.startsWith('game/staging/') || rel.startsWith('game/downloads/');

/**
 * Copy an installation to a new data root, verify it, record the new location, then remove the old copies.
 * @returns {Promise<{files:number, bytes:number}>}
 */
async function moveData({ from, to, appData, onProgress = () => {}, statfs } = {}) {
  from = path.resolve(from); to = path.resolve(to);
  if (from === to) return { files: 0, bytes: 0 };
  if (isStrictlyInside(from, to) || isStrictlyInside(to, from)) throw new LauncherError('install', 'The new location cannot be inside the old one (or the other way round).', { retryable: false });
  if (hasInstall(to)) throw new LauncherError('install', `${to} already contains an Ashen Descent installation.`, { detail: 'Choose another drive, or remove that folder first.', retryable: false });
  if (fs.existsSync(path.join(from, 'game', 'install-journal.json'))) throw new LauncherError('install', 'An update is still being installed. Try again when it has finished.');
  const files = [];
  for (const top of ['game', 'userdata', 'launcher']) await walk(path.join(from, top), from, files, SKIP);
  const bytes = files.reduce((a, f) => a + f.size, 0);
  const free = await freeSpace(to, statfs);
  if (free != null && free < bytes + 200 * 1024 * 1024) {
    throw new LauncherError('install', `Not enough free space at ${to}.`, { detail: `About ${Math.ceil((bytes + 200 * 1048576) / 1048576)} MB is needed.`, retryable: false });
  }
  let done = 0;
  try {
    for (const f of files) {
      const src = path.join(from, f.rel), dst = path.join(to, f.rel);
      await fsp.mkdir(path.dirname(dst), { recursive: true });
      await fsp.copyFile(src, dst);
      const st = await fsp.stat(dst);
      if (st.size !== f.size) throw new LauncherError('install', `Copying ${f.rel} failed (size differs).`);
      done += f.size;
      onProgress({ done, total: bytes });
    }
  } catch (e) {
    // Leave the old installation exactly as it was and remove the partial copy (only what we created).
    for (const top of ['game', 'userdata', 'launcher']) await fsp.rm(path.join(to, top), { recursive: true, force: true }).catch(() => {});
    if (e instanceof LauncherError) throw e;
    throw new LauncherError('install', `Copying to ${to} failed: ${e.code || e.message}`, { detail: e.code === 'EACCES' || e.code === 'EPERM' ? 'Windows did not allow writing there. Choose another drive or folder.' : '' });
  }
  writeLocation(appData, to);
  // The new copy is complete and in use: remove the old one. Only the launcher's own folders are removed.
  if (fs.existsSync(path.join(from, 'game', '.ashen-managed'))) await fsp.rm(path.join(from, 'game'), { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  await fsp.rm(path.join(from, 'userdata'), { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  for (const n of await fsp.readdir(path.join(from, 'launcher')).catch(() => [])) {
    if (n !== 'electron') await fsp.rm(path.join(from, 'launcher', n), { recursive: true, force: true }).catch(() => {});
  }
  return { files: files.length, bytes };
}

module.exports = { defaultRoot, locationFile, readLocation, writeLocation, resolveRoot, rootForDrive, hasInstall, listDrives, freeSpace, moveData, FOLDER };
