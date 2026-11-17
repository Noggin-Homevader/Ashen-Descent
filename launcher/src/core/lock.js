'use strict';
/**
 * A lock file that stops two launchers from updating the same installation at once (for example a second copy
 * of the launcher, or a portable copy pointed at the same folder). The file holds the owner's process id; a lock
 * left behind by a launcher that crashed is recognised as stale and replaced.
 */
const fs = require('fs');
const os = require('os');
const { LauncherError } = require('./errors');

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

class InstallLock {
  constructor(file) { this.file = file; this.held = false; this.token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

  acquire() {
    if (this.held) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = fs.openSync(this.file, 'wx');
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, host: os.hostname(), token: this.token, at: Date.now() }));
        fs.closeSync(fd);
        this.held = true;
        return;
      } catch (e) {
        if (e.code !== 'EEXIST') throw new LauncherError('install', `Could not create the install lock: ${e.message}`);
        const info = this.read();
        if (info && info.host === os.hostname() && info.pid !== process.pid && alive(info.pid)) {
          throw new LauncherError('locked', 'Another Ashen Descent launcher is updating this installation.', {
            detail: 'Wait for it to finish, or close it, then retry.',
          });
        }
        if (info && info.host && info.host !== os.hostname() && Date.now() - (info.at || 0) < 6 * 3600e3) {
          throw new LauncherError('locked', `A launcher on ${info.host} is updating this installation.`, { detail: 'Wait for it to finish, then retry.' });
        }
        // Stale: its owner is gone. Remove it and try once more.
        try { fs.unlinkSync(this.file); } catch {}
      }
    }
    throw new LauncherError('locked', 'Could not take the install lock.', { detail: 'Retry in a moment.' });
  }

  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return null; } }

  release() {
    if (!this.held) return;
    const info = this.read();
    if (info && info.token === this.token) { try { fs.unlinkSync(this.file); } catch {} }
    this.held = false;
  }
}

module.exports = { InstallLock, alive };
