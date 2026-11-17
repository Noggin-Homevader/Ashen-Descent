'use strict';
/**
 * The launcher's brain: checks GitHub, downloads and installs updates, starts the game, and publishes one state
 * object that the window draws. It has no Electron code in it, so it is tested directly with Node.
 *
 * Phases: checking -> downloading -> installing -> verifying -> ready
 *         failed (with a reason and Retry; Play stays available when a working copy is installed)
 *         running (the game is open)
 */
const path = require('path');
const { EventEmitter } = require('events');
const semver = require('./semver');
const { GitHubClient, FileCache } = require('./github');
const { findLatest } = require('./select');
const { download } = require('./download');
const { Installer } = require('./installer');
const { InstallLock } = require('./lock');
const { GameRunner } = require('./game');
const { LauncherError, describeError } = require('./errors');

const BUSY = new Set(['checking', 'downloading', 'installing', 'verifying']);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

class Updater extends EventEmitter {
  /**
   * @param {object} o
   * @param {object} o.config            from config.loadConfig()
   * @param {string} o.root              data root
   * @param {Function} o.fetch
   * @param {{os:string,arch:string}} o.platform
   * @param {string} o.launcherVersion
   * @param {{get:Function,set:Function}} [o.settings]
   * @param {GameRunner} [o.gameRunner]
   * @param {Function} [o.webRuntime]    passed to the GameRunner when it is created here
   * @param {Function} [o.log]
   * @param {object} [o.installerHooks]
   * @param {number[]} [o.retryDelays]   waits between automatic download retries
   */
  constructor(o) {
    super();
    this.o = o;
    this.config = o.config;
    this.log = o.log || (() => {});
    this.settings = o.settings || { get: (k, d) => d, set: () => {} };
    this.installer = new Installer(o.root, { hooks: o.installerHooks, log: this.log });
    this.L = this.installer.L;
    this.lock = new InstallLock(this.L.lock);
    this.github = new GitHubClient({
      fetch: o.fetch, apiBaseUrl: this.config.apiBaseUrl, owner: this.config.github.owner, repo: this.config.github.repo,
      userAgent: `AshenDescentLauncher/${o.launcherVersion}`, timeoutMs: this.config.requestTimeoutMs,
      cache: new FileCache(path.join(this.L.launcher, 'cache', 'releases.json')),
    });
    this.game = o.gameRunner || new GameRunner({
      pidFile: this.L.gamePid, webRuntime: o.webRuntime,
      env: { ASHEN_USER_DATA: this.L.userdata, ASHEN_SCREENSHOTS: this.L.screenshots, ASHEN_MODS: this.L.mods },
    });
    this.game.on('exit', (e) => this._onGameExit(e));
    this.retryDelays = o.retryDelays || [1500, 4000];
    this.busy = null;
    this.first = true;
    this.ac = null;
    this.s = {
      phase: 'checking', message: 'Starting…', installed: null, available: null, progress: null,
      error: null, notice: null, canPlay: false, canRetry: false, updatePending: false,
      allowPrerelease: this._allowPre(), platform: o.platform, launcherVersion: o.launcherVersion,
    };
  }

  _allowPre() { return this.settings.get('allowPrerelease', this.config.allowPrerelease) === true; }

  get state() { return JSON.parse(JSON.stringify(this.s)); }

  _set(patch) {
    Object.assign(this.s, patch);
    this.emit('state', this.state);
  }

  start() { return this.check(); }

  /** Check for updates and install one if needed. Calls while a check is already running share it. */
  check() {
    if (this.busy) return this.busy;
    this.busy = this._check().catch((e) => { this.log(`unexpected: ${e.stack || e}`); this._fail(e, null); })
      .finally(() => { this.busy = null; this.emit('idle'); });
    return this.busy;
  }

  retry() { return this.check(); }

  async setAllowPrerelease(on) {
    this.settings.set('allowPrerelease', !!on);
    this._set({ allowPrerelease: !!on });
    if (!this.busy && this.s.phase !== 'running') await this.check();
  }

  /** Stop a download in progress (used when the window closes). Installs are never interrupted on purpose. */
  abort() { if (this.ac) this.ac.abort(); }

  get installing() { return this.s.phase === 'installing' || this.s.phase === 'verifying'; }

  async _check() {
    this._set({ phase: 'checking', message: 'Checking for updates…', error: null, progress: null, canPlay: false, canRetry: false, allowPrerelease: this._allowPre() });
    await this.installer.init();
    let notice = this.carryNotice || null;
    this.carryNotice = null;
    if (this.first) {
      this.first = false;
      const rec = await this.installer.recover();
      if (rec) {
        notice = rec.action === 'completed'
          ? `The update to ${rec.version} was interrupted last time; it has now been finished.`
          : `An interrupted update to ${rec.version} was undone; your previous version was kept.`;
      }
    }
    const inst = await this.installer.verifyCurrent();
    this._set({ installed: inst ? { version: inst.version, ok: inst.ok } : null, notice });
    // The launcher updates itself first (it may restart here); a failure never blocks the game update.
    if (this.o.selfUpdate) {
      let r;
      try { r = await this.o.selfUpdate(this); } catch (e) {
        this.log(`launcher self-update failed: ${e.message} ${e.detail || ''}`);
        notice = `The launcher could not update itself (${e.message}). It will try again later.`;
        this._set({ notice, selfUpdate: null, progress: null });
      }
      if (r === 'restarting') return;
      this._set({ phase: 'checking', message: 'Checking for updates\u2026', progress: null, selfUpdate: null });
    }
    if (inst && !inst.ok) this.log(`installed ${inst.version} needs repair: ${inst.problems.slice(0, 5).join(', ')}`);

    let latest;
    try {
      latest = await findLatest({
        github: this.github, config: this.config, platform: this.o.platform,
        launcherVersion: this.o.launcherVersion, allowPrerelease: this._allowPre(), log: this.log,
      });
    } catch (e) {
      this.log(`update check failed: ${e.message} ${e.detail || ''}`);
      return this._fail(e, inst, 'check');
    }
    this.latest = latest;
    this._set({
      available: { version: latest.version, notes: latest.notes, publishedAt: latest.publishedAt, htmlUrl: latest.htmlUrl, prerelease: latest.prerelease, size: latest.build.size },
    });
    if (latest.stale) notice = 'GitHub limited update checks from your network, so the last known release list was used.';
    const needs = !inst || !inst.ok || semver.compare(latest.version, inst.version) > 0;
    if (!needs) {
      if (semver.compare(inst.version, latest.version) > 0) notice = `You have version ${inst.version}, which is newer than the latest ${this._allowPre() ? '' : 'stable '}release (${latest.version}).`;
      return this._ready(notice);
    }
    if (notice) this._set({ notice });
    return this._update(latest, inst);
  }

  async _update(latest, inst) {
    if (this.game.isRunning()) {
      return this._set({
        phase: 'running', updatePending: true, canPlay: false, canRetry: false, progress: null,
        message: `Version ${latest.version} is ready to install. It will install when you close the game.`,
      });
    }
    try { this.lock.acquire(); } catch (e) { return this._fail(e, inst, 'update'); }
    this.ac = new AbortController();
    const repair = inst && !inst.ok && inst.version === latest.version;
    const label = !inst ? `Downloading Ashen Descent ${latest.version}` : repair ? `Repairing version ${latest.version}` : `Downloading update ${latest.version}`;
    try {
      const dest = this.installer.archivePath(latest.build.file);
      const total = latest.build.size;
      this._set({ phase: 'downloading', message: `${label}…`, updatePending: false, progress: { kind: 'download', received: 0, total, speed: 0, fraction: 0 }, canPlay: false });
      for (let attempt = 0; ; attempt++) {
        try {
          await download({
            fetch: this.o.fetch, url: latest.asset.url, dest, size: total, sha256: latest.build.sha256,
            signal: this.ac.signal, stallTimeoutMs: this.config.downloadStallTimeoutMs, userAgent: `AshenDescentLauncher/${this.o.launcherVersion}`,
            onProgress: (p) => this._set({ phase: 'downloading', message: `${label}…`, progress: { kind: 'download', received: p.received, total: p.total, speed: p.speed, fraction: p.total ? p.received / p.total : 0 } }),
          });
          break;
        } catch (e) {
          const again = e instanceof LauncherError && e.kind === 'network' && attempt < this.retryDelays.length && !this.ac.signal.aborted;
          if (!again) throw e;
          const wait = this.retryDelays[attempt];
          this.log(`download interrupted (${e.message}); resuming in ${wait} ms`);
          this._set({ message: `Connection interrupted. Resuming in ${Math.ceil(wait / 1000)}s…` });
          await delay(wait);
        }
      }
      if (this.game.isRunning()) throw new LauncherError('game-running', 'Close Ashen Descent so the update can be installed.', { detail: 'Retry once the game has closed.' });
      this._set({ phase: 'installing', message: `Installing version ${latest.version}…`, progress: { kind: 'install', received: 0, total: 0, speed: 0, fraction: 0 } });
      await this.installer.install({
        version: latest.version, archive: dest, build: latest.build,
        onProgress: (p) => this._set({ progress: { kind: 'install', received: p.done, total: p.total, speed: 0, fraction: p.total ? p.done / p.total : 1 } }),
      });
      this._set({ phase: 'verifying', message: 'Verifying files…', progress: null });
      const v = await this.installer.verifyCurrent({ deep: true });
      if (!v || !v.ok) throw new LauncherError('integrity', 'The installed files did not pass verification.', { detail: (v && v.problems.slice(0, 3).join(', ')) || '' });
      this._set({ installed: { version: v.version, ok: true } });
      this.log(`installed ${v.version}`);
      return this._ready(this.s.notice);
    } catch (e) {
      this.log(`update failed: ${e.message} ${e.detail || ''}`);
      const now = await this.installer.verifyCurrent().catch(() => null);
      return this._fail(e, now, 'update');
    } finally {
      this.ac = null;
      this.lock.release();
    }
  }

  _ready(notice) {
    if (this.game.isRunning()) {
      return this._set({ phase: 'running', message: 'Ashen Descent is running.', canPlay: false, canRetry: false, progress: null, error: null, notice: notice || null });
    }
    return this._set({ phase: 'ready', message: 'Ready to play', canPlay: true, canRetry: false, progress: null, error: null, notice: notice || null });
  }

  /**
   * Report a failure. With a working installation the player can still play it offline; without one,
   * only Retry is offered.
   */
  _fail(e, inst, during) {
    const d = describeError(e);
    const playable = !!(inst && inst.ok);
    if (playable && during === 'check') {
      // The check failed but the installed copy works: stay ready and explain.
      return this._set({
        phase: 'ready', message: 'Ready to play (offline)', canPlay: !this.game.isRunning(), canRetry: true, progress: null,
        error: { ...d, offline: true }, notice: `You can still play version ${inst.version} offline.`,
      });
    }
    return this._set({
      phase: 'failed', progress: null, canRetry: true, canPlay: playable && !this.game.isRunning(),
      message: playable ? `Update failed. Version ${inst.version} is still installed.` : inst && !inst.ok ? 'The installed game is damaged and could not be repaired.' : 'The game could not be installed.',
      error: d,
    });
  }

  /** Start the installed game. */
  async play() {
    if (this.busy || BUSY.has(this.s.phase)) throw new LauncherError('game-running', 'Wait for the update to finish.', { retryable: false });
    if (!this.s.canPlay) throw new LauncherError('launch', 'The game is not ready to play.', { retryable: false });
    if (this.game.isRunning()) { this._set({ phase: 'running', canPlay: false }); throw new LauncherError('game-running', 'Ashen Descent is already running.', { retryable: false }); }
    const info = await this.installer.launchInfo();
    if (!info) {
      this._set({ phase: 'failed', canPlay: false, canRetry: true, message: 'The installed game is damaged.', error: { kind: 'install', title: 'Some game files are missing or changed', detail: 'Retry to repair the installation.', retryable: true } });
      return null;
    }
    const prev = { phase: this.s.phase, message: this.s.message, error: this.s.error, canRetry: this.s.canRetry };
    this._set({ phase: 'running', message: 'Ashen Descent is running.', canPlay: false, canRetry: false });
    try {
      const r = await this.game.launch(info);
      this.log(`game started (pid ${r.pid}, ${info.runtime}, ${info.version})`);
      return r;
    } catch (e) {
      const d = describeError(e);
      this._set({ ...prev, phase: prev.phase === 'running' ? 'ready' : prev.phase, canPlay: true, notice: `${d.title}. ${d.detail}` });
      throw e;
    }
  }

  _onGameExit(e) {
    this.log(`game exited (code ${e.code}, signal ${e.signal}, ${Math.round(e.ms / 1000)}s)`);
    const notice = e.crashed ? `The game closed unexpectedly (exit code ${e.code}). If this keeps happening, Retry will check and repair the game files.` : null;
    this.carryNotice = notice;
    // Look for updates again: cheap (cached), and installs anything that was waiting for the game to close.
    this.check();
  }
}

module.exports = { Updater };
