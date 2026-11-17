'use strict';
/**
 * The game runtime for web builds.
 *
 * Started by the launcher as its own process:
 *   <launcher executable> --ashen-game <install>/index.html --ashen-profile <data>/userdata/profile [game args]
 *
 * The game is served from a private "ashen-game://app/" address that maps onto the installed version's folder.
 * Because that address never changes between versions, the game's browser storage (its saves and settings) stays
 * the same across updates, and it is kept in the profile folder under userdata/, outside the files that updates
 * replace.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, protocol, net, shell, session, Menu, ipcMain, screen } = require('electron');
const { createRoomBridge } = require('../core/room-bridge');

const SCHEME = 'ashen-game';

function inside(base, p) { const r = path.relative(base, p); return !!r && !r.startsWith('..') && !path.isAbsolute(r); }

function run(argv, i) {
  const entry = path.resolve(argv[i + 1] || '');
  const pi = argv.indexOf('--ashen-profile');
  const profile = pi !== -1 ? path.resolve(argv[pi + 1]) : path.join(app.getPath('appData'), 'Ashen Descent', 'userdata', 'profile');
  if (!fs.existsSync(entry)) {
    process.stderr.write(`Ashen Descent: game file not found: ${entry}\n`);
    app.exit(3);
    return;
  }
  // The launcher starts the game with the install folder as its working folder.
  const root = inside(process.cwd(), entry) ? process.cwd() : path.dirname(entry);
  const entryRel = path.relative(root, entry).split(path.sep).map(encodeURIComponent).join('/');

  fs.mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
  app.setName('Ashen Descent');
  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
  // One game window per profile: a second start just brings the first one forward.
  if (!app.requestSingleInstanceLock()) { app.quit(); return; }

  // Multiplayer: --ashen-mp <ws(s)://server> from the launcher. The connection lives here, in the game's main
  // process, and the page reaches it through game-preload.js.
  const mi = argv.indexOf('--ashen-mp');
  const mpUrl = mi !== -1 && /^wss?:\/\//.test(argv[mi + 1] || '') ? argv[mi + 1] : null;

  let win = null;
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on('window-all-closed', () => app.quit());

  function wireMultiplayer() {
    const bridge = createRoomBridge({ url: mpUrl, send: (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); } });
    for (const [ch, fn] of Object.entries(bridge.handlers)) {
      ipcMain.handle(ch, async (e, ...a) => { if (!win || e.sender !== win.webContents) throw new Error('refused'); return fn(...a); });
    }
    app.on('before-quit', () => bridge.stop());
  }

  app.whenReady().then(() => {
    protocol.handle(SCHEME, (req) => {
      let u;
      try { u = new URL(req.url); } catch { return new Response('Bad request', { status: 400 }); }
      if (u.hostname !== 'app') return new Response('Not found', { status: 404 });
      let rel;
      try { rel = decodeURIComponent(u.pathname).replace(/^\/+/, ''); } catch { return new Response('Bad request', { status: 400 }); }
      const abs = path.resolve(root, rel || entryRel);
      if (!inside(root, abs)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(abs).toString());
    });
    const allowed = new Set(['fullscreen', 'pointerLock', 'clipboard-sanitized-write']);
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.has(perm)));
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);

    // Open at the size it will have: one window appearing once, full size, instead of a small one that then grows.
    let area = { x: undefined, y: undefined, width: 1600, height: 900 };
    try { area = screen.getPrimaryDisplay().workArea; } catch {}
    win = new BrowserWindow({
      x: area.x, y: area.y, width: area.width, height: area.height, minWidth: 960, minHeight: 600, show: false, title: 'Ashen Descent',
      backgroundColor: '#050302', autoHideMenuBar: true, icon: path.join(__dirname, '..', 'renderer', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'game-preload.js'),
        additionalArguments: mpUrl ? ['--ashen-mp=1'] : [],
        contextIsolation: true, sandbox: true, nodeIntegration: false,
        // The game keeps party play in step while its window is in the background.
        backgroundThrottling: false,
      },
    });
    // Show the window once the title screen has painted (the page says so), never a blank window while it loads.
    // The launcher waits for the 'shown' line on stdout before it tucks itself into the tray.
    let shown = false;
    const reveal = () => {
      if (shown || !win || win.isDestroyed()) return; shown = true;
      win.maximize(); win.show(); if (win.focus) win.focus();
      try { process.stdout.write('ashen:shown\n'); } catch {}
    };
    ipcMain.once('game:ready', reveal);
    win.webContents.once('did-finish-load', () => setTimeout(reveal, 8000).unref?.());
    setTimeout(reveal, 20000).unref?.();
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (url.startsWith(`${SCHEME}://app/`)) return;
      e.preventDefault();
      if (/^https:\/\//.test(url)) shell.openExternal(url);
    });
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    if (mpUrl) wireMultiplayer();
    win.loadURL(`${SCHEME}://app/${entryRel}`);
  });
}

module.exports = { run };
