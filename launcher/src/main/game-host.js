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
const { app, BrowserWindow, protocol, net, shell, session, Menu } = require('electron');

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

  let win = null;
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on('window-all-closed', () => app.quit());

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

    win = new BrowserWindow({
      width: 1600, height: 900, minWidth: 960, minHeight: 600, show: false, title: 'Ashen Descent',
      backgroundColor: '#050302', autoHideMenuBar: true, icon: path.join(__dirname, '..', 'renderer', 'icon.png'),
      webPreferences: {
        contextIsolation: true, sandbox: true, nodeIntegration: false,
        // The game keeps party play in step while its window is in the background.
        backgroundThrottling: false,
      },
    });
    win.once('ready-to-show', () => { win.maximize(); win.show(); });
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (url.startsWith(`${SCHEME}://app/`)) return;
      e.preventDefault();
      if (/^https:\/\//.test(url)) shell.openExternal(url);
    });
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.loadURL(`${SCHEME}://app/${entryRel}`);
  });
}

module.exports = { run };
