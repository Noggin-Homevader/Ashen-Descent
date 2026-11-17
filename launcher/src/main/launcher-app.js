'use strict';
/** The launcher window: wires the Updater to the title-screen UI over IPC. */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, shell, net, Menu, dialog, Tray, nativeImage } = require('electron');
const { loadConfig, Settings } = require('../core/config');
const { Updater } = require('../core/updater');
const { current } = require('../core/platform');
const { layout } = require('../core/installer');
const { describeError, LauncherError } = require('../core/errors');
const loc = require('../core/location');
const mp = require('../core/multiplayer');
const { SelfUpdater, detectInstallKind, swapScript } = require('../core/self-update');
const { spawn } = require('child_process');
const { createLog } = require('./log');

const RENDERER = path.join(__dirname, '..', 'renderer', 'index.html');
const ICON = path.join(__dirname, '..', 'renderer', 'icon.png');

function run() {
  // Everything the launcher writes lives under one data folder, split into game/, userdata/ and launcher/.
  // It is %APPDATA%\Ashen Descent unless the player chose another drive (location.json) or ASHEN_DATA_DIR is set.
  const appData = app.getPath('appData');
  const { root, source } = loc.resolveRoot(appData);
  const L = layout(root);
  // First start on Windows with nothing installed: ask which drive to install on before downloading anything.
  let askLocation = source === 'default' && process.platform === 'win32' && !loc.hasInstall(root) && !process.env.ASHEN_SKIP_LOCATION;
  let moving = null;
  // Keep Chromium's own cache and storage for the launcher window out of the game and save folders.
  app.setPath('userData', path.join(L.launcher, 'electron'));
  if (!app.requestSingleInstanceLock()) { app.quit(); return; }

  const log = createLog(path.join(L.launcher, 'logs'));
  log(`launcher ${app.getVersion()} starting; data at ${root} (${source})`);
  let win = null, updater = null, configError = null, started = false, config = null, settings = null;
  let gameServer = null, mpStarted = false; // the relay address handed to the game at launch (null: no party play)

  try {
    config = loadConfig();
    settings = new Settings(path.join(L.launcher, 'settings.json')).load();
    updater = new Updater({
      config, root, settings, log,
      fetch: (url, init) => net.fetch(url, init),
      platform: current(), launcherVersion: app.getVersion(),
      // Web builds open in this same executable, in game mode, as a separate process.
      selfUpdate: (u) => selfUpdate(u),
      webRuntime: (info) => ({
        command: process.execPath,
        args: [...(process.defaultApp ? [app.getAppPath()] : []), '--ashen-game', info.executable, '--ashen-profile', L.profile,
          ...(gameServer ? ['--ashen-mp', gameServer] : []), ...info.args],
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
    try {
      // Online is the normal way to play: make sure the game gets the server even if the first lookup failed.
      if (mpPrefs().mode === 'online' && !gameServer) {
        try { if (await findOnline()) { gameServer = online.url; log(`multiplayer: online -> ${gameServer}`); pushMp(); } } catch (e) { log(`multiplayer: ${e.message}`); }
      }
      // Stay on screen until the game window is up, then tuck into the tray until it closes (no empty gap between).
      let tucked = false;
      const tuck = () => {
        if (tucked) return; tucked = true; clearTimeout(fallback);
        if (!updater.game.isRunning()) return;
        hiddenForGame = true; updateTray(); if (win && !win.isDestroyed()) win.hide();
      };
      const fallback = setTimeout(tuck, 15000);
      updater.game.once('shown', tuck);
      await updater.play();
      return { ok: true };
    } catch (e) { return { ok: false, error: describeError(e) }; }
  });
  handle('launcher:prerelease', (on) => updater && updater.setAllowPrerelease(on === true));
  handle('launcher:open', (what) => {
    const dirs = { saves: L.userdata, game: L.game, logs: path.join(L.launcher, 'logs'), root };
    if (dirs[what]) return shell.openPath(dirs[what]);
  });
  handle('launcher:release-page', () => {
    const s = updater && updater.state;
    const fallback = updater ? `https://github.com/${updater.config.github.owner}/${updater.config.github.repo}/releases` : null;
    const gh = (u) => typeof u === 'string' && /^https:\/\/github\.com\//.test(u);
    const url = gh(s && s.available && s.available.htmlUrl) ? s.available.htmlUrl : fallback;
    if (gh(url)) return shell.openExternal(url);
  });
  /* ---- install location ---- */
  const locationState = async () => {
    const drives = (await loc.listDrives()).map((d) => ({ ...d, root: loc.rootForDrive(d.letter, appData) }));
    return { root, source, ask: askLocation, installed: loc.hasInstall(root), drives, moving, platform: process.platform, freeHere: await loc.freeSpace(root) };
  };
  const relaunch = () => { log('restarting for the new install location'); if (updater) updater.abort(); app.relaunch(); app.exit(0); };
  handle('launcher:location', locationState);
  handle('launcher:set-location', async (choice) => {
    try {
      let target;
      if (choice && choice.browse) {
        const r = await dialog.showOpenDialog(win, { title: 'Choose a folder for Ashen Descent', properties: ['openDirectory', 'createDirectory'], defaultPath: path.dirname(root) });
        if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
        target = path.basename(r.filePaths[0]).toLowerCase() === loc.FOLDER.toLowerCase() ? r.filePaths[0] : path.join(r.filePaths[0], loc.FOLDER);
      } else if (choice && typeof choice.drive === 'string' && /^[A-Za-z]:\\?$/.test(choice.drive)) {
        target = loc.rootForDrive(choice.drive, appData);
      } else if (choice && choice.keep) {
        target = root;
      } else throw new LauncherError('config', 'Unknown location.', { retryable: false });
      target = path.resolve(target);
      if (updater && (updater.busy || updater.game.isRunning())) throw new LauncherError('game-running', 'Close the game and wait for any update to finish, then try again.', { retryable: false });
      if (target === path.resolve(root)) {
        loc.writeLocation(appData, root);
        if (askLocation) { askLocation = false; if (updater && !started) { started = true; updater.start(); } }
        return { ok: true, restarting: false };
      }
      try { fs.mkdirSync(target, { recursive: true }); const t = path.join(target, `.write-test-${process.pid}`); fs.writeFileSync(t, ''); fs.unlinkSync(t); } catch (e) {
        throw new LauncherError('install', `Cannot write to ${target} (${e.code || e.message}).`, { detail: 'Choose another drive or folder.', retryable: false });
      }
      if (!loc.hasInstall(root)) { loc.writeLocation(appData, target); setTimeout(relaunch, 300); return { ok: true, restarting: true }; }
      moving = { done: 0, total: 0, to: target };
      log(`moving installation from ${root} to ${target}`);
      await loc.moveData({ from: root, to: target, appData, onProgress: (p) => { moving = { ...p, to: target }; if (win && !win.isDestroyed()) win.webContents.send('launcher:location-progress', moving); } });
      setTimeout(relaunch, 300);
      return { ok: true, restarting: true };
    } catch (e) {
      moving = null;
      log(`location change failed: ${e.message}`);
      return { ok: false, error: describeError(e) };
    }
  });
  /* ---- multiplayer: online server, host on this PC, or join a friend ---- */
  const host = new mp.LocalHost({ port: (config && config.multiplayer && config.multiplayer.hostPort) || mp.DEFAULT_PORT, log });
  let online = null, onlineStatus = null;
  const mpPrefs = () => ({ mode: mp.MODES.includes(settings && settings.get('mpMode')) ? settings.get('mpMode') : 'online', join: (settings && settings.get('mpJoin', '')) || '' });
  const mpState = () => {
    const { mode, join } = mpPrefs();
    return {
      mode, join, server: gameServer,
      online: online ? { name: online.name, url: online.url, status: onlineStatus } : null,
      host: { running: host.running, port: host.port, players: host.players, error: host.error, addresses: mp.lanAddresses().map((a) => a.address) },
    };
  };
  const pushMp = () => { if (win && !win.isDestroyed()) win.webContents.send('launcher:mp-state', mpState()); updateTray(); };
  // Look the online server up (again) if it is not known yet: it may have been set up after the launcher started.
  async function findOnline() {
    if (!online && config) online = await mp.onlineServer((u, i) => net.fetch(u, i), config);
    return online;
  }
  async function applyMp() {
    const { mode, join } = mpPrefs();
    if (mode === 'host') await host.start(); else await host.stop();
    if (mode === 'online') {
      await findOnline();
      // The game gets the address straight away; a sleeping server wakes while the game reconnects on its own.
      gameServer = online ? online.url : null;
      if (online) { onlineStatus = { checking: true }; pushMp(); onlineStatus = await mp.health((u, i) => net.fetch(u, i), online.url, 60000); }
    }
    gameServer = mode === 'online' ? (online && online.url) || null
      : mode === 'host' ? (host.running ? `ws://127.0.0.1:${host.port}` : null)
        : mode === 'join' ? mp.joinUrl(join, host.port) : null;
    log(`multiplayer: ${mode}${gameServer ? ` -> ${gameServer}` : ' (party play off)'}`);
    pushMp();
  }
  handle('launcher:mp', () => mpState());
  handle('launcher:mp-set', async (o) => {
    if (!settings || !o || !mp.MODES.includes(o.mode)) return mpState();
    if (o.mode === 'join' && !mp.joinUrl(o.join)) return { ...mpState(), error: 'Type your friend\u2019s address, for example 192.168.1.20' };
    settings.set('mpMode', o.mode);
    if (typeof o.join === 'string') settings.set('mpJoin', o.join.trim().slice(0, 200));
    await applyMp();
    return mpState();
  });

  /* ---- the launcher updating itself (see core/self-update.js) ---- */
  const installKind = detectInstallKind();
  let su = null;
  async function selfUpdate(u) {
    if (!su) su = new SelfUpdater({ github: u.github, fetch: (a, i) => net.fetch(a, i), currentVersion: app.getVersion(), platform: current(), kind: installKind, dir: path.join(L.launcher, 'update'), execPath: process.execPath, log });
    if (!su.canUpdate) return;
    u._set({ message: 'Checking for launcher updates\u2026' });
    const info = await su.check({ allowPrerelease: !!(settings && settings.get('allowPrerelease') === true) });
    if (!info) return;
    log(`launcher update ${info.version} available (${info.build.kind})`);
    if (!info.applies) {
      u._set({ notice: `Launcher ${info.version} is available. Use Releases to download it (macOS apps cannot update themselves yet).` });
      return;
    }
    if (u.game.isRunning() || host.players > 0) { log('launcher update waits: the game is running or friends are connected'); return; }
    const total = info.build.size;
    u._set({ phase: 'downloading', canPlay: false, canRetry: false, message: `Updating the launcher to ${info.version}\u2026`, selfUpdate: { version: info.version }, progress: { kind: 'download', received: 0, total, speed: 0, fraction: 0 } });
    const prep = await su.prepare(info, { onProgress: (p) => u._set({ progress: { kind: 'download', received: p.received, total: p.total, speed: p.speed, fraction: p.total ? p.received / p.total : 0 } }) });
    if (u.game.isRunning()) return;
    u._set({ phase: 'installing', message: `Restarting to finish the launcher update to ${info.version}\u2026`, progress: null });
    log(`applying launcher update ${info.version}`);
    applySelfUpdate(info, prep);
    return 'restarting';
  }
  function applySelfUpdate(info, prep) {
    const detached = { detached: true, stdio: 'ignore', windowsHide: true };
    if (info.build.kind === 'nsis') {
      // The setup installs silently over this copy (same folder) and starts the launcher again.
      spawn(prep.file, ['--updated', '/S', '--force-run'], detached).unref();
    } else if (info.build.kind === 'zip') {
      const script = path.join(L.launcher, 'update', 'swap-launcher.cmd');
      fs.writeFileSync(script, swapScript({ pid: process.pid, appDir: path.dirname(process.execPath), staging: prep.staging }));
      spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', script], detached).unref();
    } else if (info.build.kind === 'appimage') {
      const target = process.env.APPIMAGE;
      fs.copyFileSync(prep.file, `${target}.new`);
      fs.chmodSync(`${target}.new`, 0o755);
      fs.renameSync(`${target}.new`, target);
      spawn(target, [], detached).unref();
    }
    quitting = true;
    setTimeout(() => app.quit(), 400);
  }
  // Look for launcher and game updates every 30 minutes while the launcher is idle (also while it sits in the tray).
  setInterval(() => {
    if (!updater || updater.busy || !started) return;
    if (!['ready', 'failed'].includes(updater.state.phase) || updater.game.isRunning()) return;
    updater.check();
  }, 30 * 60e3).unref?.();

  /* ---- tray: the launcher waits there while the game runs (and while hosting) ---- */
  let tray = null, quitting = false, hiddenForGame = false;
  const showWin = () => { if (!win || win.isDestroyed()) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); };
  function updateTray() {
    const want = hiddenForGame || host.running;
    if (!want) { if (tray) { tray.destroy(); tray = null; } return; }
    if (!tray) {
      tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
      tray.on('click', showWin); tray.on('double-click', showWin);
    }
    const playing = updater && updater.state.phase === 'running';
    tray.setToolTip(`Ashen Descent${playing ? ' \u2014 playing' : ''}${host.running ? ` \u2014 hosting (${host.players} connected)` : ''}`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Ashen Descent launcher', click: showWin },
      { type: 'separator' },
      { label: host.running ? 'Quit (stops hosting)' : 'Quit launcher', click: () => { quitting = true; app.quit(); } },
    ]));
  }
  if (updater) {
    let last = updater.state.phase;
    updater.on('state', (st) => {
      if (last === 'running' && st.phase !== 'running' && hiddenForGame) { hiddenForGame = false; showWin(); }
      last = st.phase;
      updateTray();
    });
  }
  app.on('before-quit', () => { quitting = true; host.stop(); });

  handle('window:minimize', () => win && win.minimize());
  handle('window:close', () => win && win.close());

  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.on('window-all-closed', () => { if (!host.running || quitting) app.quit(); });

  app.whenReady().then(() => {
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1180, height: 740, minWidth: 940, minHeight: 620,
      frame: false, titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
      backgroundColor: '#050302', show: false, title: 'Ashen Descent',
      icon: path.join(__dirname, '..', 'renderer', 'icon.png'),
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
    });
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.once('ready-to-show', () => win.show());
    win.webContents.on('did-finish-load', () => {
      if (!started && updater && !askLocation) { started = true; updater.start(); }
      if (!mpStarted) { mpStarted = true; applyMp().catch((e) => log(`multiplayer: ${e.message}`)); }
    });
    win.on('close', (e) => {
      if (host.running && !quitting) {
        // Hosting keeps running in the tray; Quit there stops it.
        e.preventDefault(); win.hide(); updateTray(); return;
      }
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
