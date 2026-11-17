'use strict';
/**
 * Launcher configuration.
 *
 * launcher/launcher.config.json ships inside the launcher and names the GitHub repository that publishes game
 * releases. Players can change one thing, whether prereleases are offered, in <data>/launcher/settings.json
 * (the launcher's own toggle writes it). Nothing here is secret: the launcher only reads public releases.
 */
const fs = require('fs');
const path = require('path');
const { LauncherError } = require('./errors');

const DEFAULTS = {
  productName: 'Ashen Descent',
  gameId: 'ashen-descent',
  github: { owner: '', repo: '' },
  apiBaseUrl: 'https://api.github.com',
  tagPrefix: 'v',
  manifestAssetName: 'ashen-manifest.json',
  allowPrerelease: false,
  requestTimeoutMs: 20000,
  downloadStallTimeoutMs: 30000,
};

const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

function normalise(raw, source) {
  const c = { ...DEFAULTS, ...raw, github: { ...DEFAULTS.github, ...(raw && raw.github) } };
  const bad = (m) => new LauncherError('config', `${source}: ${m}`, { retryable: false });
  if (!NAME.test(c.github.owner) || !NAME.test(c.github.repo)) throw bad('github.owner and github.repo must name the repository that publishes releases.');
  if (typeof c.apiBaseUrl !== 'string' || !/^https?:\/\//.test(c.apiBaseUrl)) throw bad('apiBaseUrl must be an http(s) URL.');
  c.apiBaseUrl = c.apiBaseUrl.replace(/\/+$/, '');
  if (typeof c.tagPrefix !== 'string') throw bad('tagPrefix must be text.');
  if (!/^[\w.+-]+$/.test(c.manifestAssetName)) throw bad('manifestAssetName must be a file name.');
  c.allowPrerelease = c.allowPrerelease === true;
  for (const k of ['requestTimeoutMs', 'downloadStallTimeoutMs']) if (!(Number.isFinite(c[k]) && c[k] >= 1000)) c[k] = DEFAULTS[k];
  return c;
}

/** Read the shipped config. `ASHEN_LAUNCHER_CONFIG` can point at another file (used by tests and staging builds). */
function loadConfig(file = process.env.ASHEN_LAUNCHER_CONFIG || path.join(__dirname, '..', '..', 'launcher.config.json')) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    throw new LauncherError('config', `Could not read ${file}: ${e.message}`, { retryable: false });
  }
  return normalise(raw, path.basename(file));
}

class Settings {
  constructor(file) { this.file = file; this.data = {}; }
  load() {
    try { const d = JSON.parse(fs.readFileSync(this.file, 'utf8')); this.data = d && typeof d === 'object' ? d : {}; } catch { this.data = {}; }
    return this;
  }
  get(k, dflt) { return this.data[k] === undefined ? dflt : this.data[k]; }
  set(k, v) {
    this.data[k] = v;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}

module.exports = { loadConfig, normalise, Settings, DEFAULTS };
