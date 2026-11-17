'use strict';
/** The launcher window: wires the Updater to the title-screen UI over IPC. */
const path = require('path');
const { app, BrowserWindow, ipcMain, shell, net, Menu } = require('electron');
const { loadConfig, Settings } = require('../core/config');
const { Updater } = require('../core/updater');
const { current } = require('../core/platform');
const { layout } = require('../core/installer');
const { describeError } = require('../core/errors');
const { createLog } = require('./log');

const RENDERER = path.join(__dirname, '..', 'renderer', 'index.html');

function dataRoot() {
  // Everything the launcher writes lives under one folder, split into game/, userdata/ and launcher/.
  // ASHEN_DATA_DIR overrides it (portable installs, testing).
  return process.env.ASHEN_DATA_DIR ? path.resolve(process.env.ASHEN_DATA_DIR) : path.join(app.getPath('appData'), 'Ashen Descent');
}

function run() {
  const root = dataRoot();
  const L = layout(root);
  // Keep Chromium's own cache and storage for the launcher window out of the game and save folders.
  app.setPath('userData', path.join(L.launcher, 'electron'));
  if (!app.requestSingleInstanceLock()) { app.quit(); return; }

  const log = createLog(path.join(L.launcher, 'logs'));
  log(`launcher ${app.getVersion()} starting; data at ${root}`);
  let win = null, updater = null, configError = null, started = false;

  try {
    const config = loadConfig();
    const settings = new Settings(path.join(L.launcher, 'settings.json')).load();
    updater = new Updater({
      config, root, settings, log,
      fetch: (url, init) => net.fetch(url, init),
      platform: current(), launcherVersion: app.getVersion(),
      // Web builds open in this same executable, in game mode, as a separate process.
      webRuntime: (info) => ({
        command: process.execPath,
        args: [...(process.defaultApp ? [app.getAppPath()] : []), '--ashen-game', info.executable, '--ashen-profile', L.profile, ...info.args],
      }),
    });
  } catch (e) {
    configError = describeError(e);
    log(`config error: ${e.message}`);
  }

  const send = (s) => { if (win && !win.isDestroyed()) win.webContents.send('launcher:state', s); };
  if (updater) updater.on('state', send);

  const fromUs = (e) => { try { return new URL(e.senderFrame.url).protocol === 'file:'; } catch { return false; } };
  const handle = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => { if (!fromUs(e)) throw new Error('refused'); return fn(...a); });

  handle('launcher:get-state', () => updater ? updater.state : {
    phase: 'failed', message: 'The launcher could not start.', error: configError, canPlay: false, canRetry: false, installed: null, available: null, launcherVersion: app.getVersion(),
  });
  handle('launcher:retry', () => { if (updater) updater.retry(); });
  handle('launcher:play', async () => {
    try { await updater.play(); return { ok: true }; } catch (e) { return { ok: false, error: describeError(e) }; }
  });
  handle('launcher:prerelease', (on) => updater && updater.setAllowPrerelease(on === true));
  handle('launcher:open', (what) => {
    const dirs = { saves: L.userdata, game: L.game, logs: path.join(L.launcher, 'logs') };
    if (dirs[what]) return shell.openPath(dirs[what]);
  });
  handle('launcher:release-page', () => {
    const s = updater && updater.state;
    const fallback = updater ? `https://github.com/${updater.config.github.owner}/${updater.config.github.repo}/releases` : null;
    const gh = (u) => typeof u === 'string' && /^https:\/\/github\.com\//.test(u);
    const url = gh(s && s.available && s.available.htmlUrl) ? s.available.htmlUrl : fallback;
    if (gh(url)) return shell.openExternal(url);
  });
  handle('window:minimize', () => win && win.minimize());
  handle('window:close', () => win && win.close());

  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.on('window-all-closed', () => app.quit());

  app.whenReady().then(() => {
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1180, height: 740, minWidth: 940, minHeight: 620,
      frame: false, titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
      backgroundColor: '#050302', show: false, title: 'Ashen Descent',
      icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
    });
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.once('ready-to-show', () => win.show());
    win.webContents.on('did-finish-load', () => {
      if (!started && updater) { started = true; updater.start(); }
    });
    win.on('close', (e) => {
      if (updater && updater.installing) {
        // Never leave an install half done on purpose; finish it, then close.
        e.preventDefault();
        win.webContents.send('launcher:closing');
        updater.once('idle', () => { if (win && !win.isDestroyed()) win.destroy(); });
      } else if (updater) updater.abort();
    });
    win.loadFile(RENDERER);
  });
}

module.exports = { run };
