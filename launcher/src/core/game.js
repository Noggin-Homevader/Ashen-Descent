'use strict';
/**
 * Starts the game and watches it.
 *
 * "native" builds run their own executable. "web" builds (the current HTML5 game) are opened by the launcher's
 * built-in game runtime: the launcher starts a second copy of itself in game mode, as a separate process, so the
 * game runs, exits and is tracked exactly like a native executable.
 *
 * A small record (game/game-process.json) remembers the running game's process id, so a launcher that is
 * restarted while the game is open still knows not to touch the game's files.
 */
const fs = require('fs');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { LauncherError } = require('./errors');
const { alive } = require('./lock');

class GameRunner extends EventEmitter {
  /**
   * @param {object} o
   * @param {string} o.pidFile
   * @param {(info:{executable:string,args:string[],cwd:string})=>{command:string,args:string[]}} o.webRuntime
   *        how to open a web build (the Electron main process supplies this)
   * @param {object} [o.env]  extra environment variables for the game
   * @param {Function} [o.spawn]
   */
  constructor(o) {
    super();
    this.pidFile = o.pidFile; this.webRuntime = o.webRuntime; this.env = o.env || {}; this.spawn = o.spawn || spawn;
    this.child = null; this.startedAt = 0; this.watch = null;
  }

  _readPid() { try { return JSON.parse(fs.readFileSync(this.pidFile, 'utf8')); } catch { return null; } }

  /** Is a game started by this or an earlier launcher still running? */
  isRunning() {
    if (this.child && this.child.exitCode === null && this.child.signalCode === null) return true;
    const rec = this._readPid();
    if (!rec) return false;
    if (rec.pid !== process.pid && alive(rec.pid)) {
      this._watchExternal(rec.pid);
      return true;
    }
    try { fs.unlinkSync(this.pidFile); } catch {}
    return false;
  }

  /** A game left running by a previous launcher session: poll until it closes, then report the exit. */
  _watchExternal(pid) {
    if (this.watch || this.child) return;
    this.watch = setInterval(() => {
      if (!alive(pid)) {
        clearInterval(this.watch); this.watch = null;
        try { fs.unlinkSync(this.pidFile); } catch {}
        this.emit('exit', { code: null, signal: null, external: true, ms: 0 });
      }
    }, 1500);
    this.watch.unref?.();
  }

  /**
   * @param {{executable:string,args:string[],cwd:string,runtime:'native'|'web',version:string}} info
   * @returns {Promise<{pid:number}>} resolves once the process has started
   */
  launch(info) {
    if (this.isRunning()) return Promise.reject(new LauncherError('game-running', 'Ashen Descent is already running.', { retryable: false }));
    let cmd, args;
    if (info.runtime === 'web') ({ command: cmd, args } = this.webRuntime(info));
    else { cmd = info.executable; args = info.args || []; }
    return new Promise((resolve, reject) => {
      let child;
      const env = { ...process.env, ...this.env };
      delete env.ELECTRON_RUN_AS_NODE; // the web runtime must start as an app, not as plain Node
      try {
        child = this.spawn(cmd, args, { cwd: info.cwd, stdio: 'ignore', windowsHide: false, detached: false, env });
      } catch (e) {
        return reject(new LauncherError('launch', `Could not start the game: ${e.message}`, { cause: e }));
      }
      this.child = child; this.startedAt = Date.now();
      let started = false;
      child.once('error', (e) => {
        this.child = null;
        try { fs.unlinkSync(this.pidFile); } catch {}
        const err = new LauncherError('launch', `Could not start the game: ${e.code || e.message}.`, {
          cause: e, detail: e.code === 'EACCES' ? 'The game file is not allowed to run. Check antivirus or file permissions.' : e.code === 'ENOENT' ? 'The game executable is missing. Retry to repair the installation.' : '',
        });
        if (!started) reject(err); else this.emit('error', err);
      });
      child.once('spawn', () => {
        started = true;
        try { fs.writeFileSync(this.pidFile, JSON.stringify({ pid: child.pid, version: info.version, startedAt: new Date().toISOString() })); } catch {}
        resolve({ pid: child.pid });
      });
      child.once('exit', (code, signal) => {
        const ms = Date.now() - this.startedAt;
        this.child = null;
        try { const r = this._readPid(); if (r && r.pid === child.pid) fs.unlinkSync(this.pidFile); } catch {}
        if (started) this.emit('exit', { code, signal, ms, crashed: code !== 0 && code !== null && ms < 5000 });
      });
    });
  }
}

module.exports = { GameRunner };
