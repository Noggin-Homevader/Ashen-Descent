'use strict';
/**
 * The Electron main-process code, run against a stand-in for the Electron API (Electron itself is exercised by
 * the launcher build workflow and the manual checks in docs/LAUNCHER.md).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');
const { FakeGitHub, makePackage, tmpDir } = require('./helpers');

function stubElectron({ appPath }) {
  const st = { handlers: {}, sent: [], windows: [], protocol: null, schemes: [], quit: 0, perms: null };
  class BrowserWindow extends EventEmitter {
    constructor(o) {
      super(); this.opts = o; st.windows.push(this);
      this.webContents = Object.assign(new EventEmitter(), { send: (c, s) => st.sent.push([c, s]), setWindowOpenHandler: (f) => { this.openHandler = f; } });
    }
    loadFile(f) { this.file = f; setImmediate(() => this.webContents.emit('did-finish-load')); }
    loadURL(u) { this.url = u; }
    isDestroyed() { return false; } show() { this.visible = true; st.shown = (st.shown || 0) + 1; } hide() { this.visible = false; st.hidden = (st.hidden || 0) + 1; } maximize() {} focus() {} restore() {} isMinimized() { return false; } destroy() {} minimize() {}
  }
  const app = {
    paths: {}, getPath: (n) => app.paths[n] || path.join(st.tmp, n), setPath: (n, p) => { app.paths[n] = p; },
    requestSingleInstanceLock: () => true, on() {}, whenReady: () => Promise.resolve(), getVersion: () => '1.0.0',
    getAppPath: () => appPath, relaunch() { st.relaunched = true; }, quit: () => { st.quit++; }, exit: () => { st.quit++; }, setName() {},
  };
  return {
    st,
    electron: {
      app, BrowserWindow,
      ipcMain: { handle: (c, f) => { st.handlers[c] = f; } },
      shell: { openPath: async () => '', openExternal: async (u) => { st.opened = u; } },
      net: { fetch: (u, i) => fetch(u, i) },
      Menu: { setApplicationMenu() {}, buildFromTemplate: (t) => ({ items: t }) },
      Tray: class { constructor() { st.tray = this; this.alive = true; } on() {} setToolTip(t) { this.tip = t; } setContextMenu(m) { this.menu = m; } destroy() { this.alive = false; st.tray = null; } },
      nativeImage: { createFromPath: () => ({ resize: () => ({}) }) },
      dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
      protocol: { registerSchemesAsPrivileged: (s) => st.schemes.push(...s), handle: (s, f) => { st.protocol = f; } },
      session: { defaultSession: { setPermissionRequestHandler: (f) => { st.perms = f; } } },
    },
  };
}

function withElectron(stub, fn) {
  const orig = Module._load;
  Module._load = function (req, ...rest) { return req === 'electron' ? stub : orig.call(this, req, ...rest); };
  for (const k of Object.keys(require.cache)) if (k.includes(`${path.sep}src${path.sep}main${path.sep}`)) delete require.cache[k];
  try { return fn(); } finally { Module._load = orig; }
}

const until = async (cond, ms = 10000) => { const t = Date.now(); while (!(await cond())) { if (Date.now() - t > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 25)); } };

test('main process: launcher window, IPC and Play wiring', async (t) => {
  const gh = await new FakeGitHub().start(); t.after(() => gh.stop());
  gh.addRelease('2.0.0', [makePackage('2.0.0', { 'index.html': '<html>game</html>' })]);
  const dir = tmpDir('main');
  const cfg = path.join(dir, 'launcher.config.json');
  fs.writeFileSync(cfg, JSON.stringify({ github: { owner: 'Noggin-Homevader', repo: 'Ashen-Descent' }, apiBaseUrl: gh.base, multiplayer: { hostPort: 0 } }));
  const env = { ASHEN_LAUNCHER_CONFIG: cfg, ASHEN_DATA_DIR: path.join(dir, 'data'), ASHEN_TEST_MARKER: path.join(dir, 'launched.json') };
  Object.assign(process.env, env);
  t.after(() => { for (const k of Object.keys(env)) delete process.env[k]; delete process.defaultApp; });
  process.defaultApp = true; // like `electron .` in development: the app path comes first

  const { st, electron } = stubElectron({ appPath: path.join(__dirname, 'fixtures', 'fake-electron-app.js') });
  st.tmp = dir;
  withElectron(electron, () => require('../src/main/launcher-app').run());
  await until(() => st.windows.length === 1);
  const win = st.windows[0];
  assert.equal(win.opts.webPreferences.contextIsolation, true);
  assert.equal(win.opts.webPreferences.sandbox, true);
  assert.equal(win.opts.webPreferences.nodeIntegration, false);
  assert.match(win.file, /renderer[\\/]index\.html$/);
  assert.equal(electron.app.paths.userData, path.join(dir, 'data', 'launcher', 'electron'), 'Chromium data kept apart from game and saves');

  const ok = { senderFrame: { url: 'file:///app/index.html' } };
  const evil = { senderFrame: { url: 'https://example.com/' } };
  await assert.rejects(st.handlers['launcher:get-state'](evil), /refused/, 'IPC only from the launcher page');
  await until(async () => (await st.handlers['launcher:get-state'](ok)).phase === 'ready');
  assert.ok(st.sent.some(([c, s]) => c === 'launcher:state' && s.phase === 'downloading'), 'state is pushed to the page');

  // Party play: host on this PC; the game is started with the relay address.
  const mps = await st.handlers['launcher:mp-set'](ok, { mode: 'host' });
  assert.equal(mps.host.running, true, JSON.stringify(mps));
  assert.match(mps.server, /^ws:\/\/127\.0\.0\.1:\d+$/);
  assert.equal((await st.handlers['launcher:mp-set'](ok, { mode: 'join', join: 'not an address!' })).error !== undefined, true);
  const r = await st.handlers['launcher:play'](ok);
  assert.deepEqual(r, { ok: true });
  await until(() => fs.existsSync(env.ASHEN_TEST_MARKER));
  const m = JSON.parse(fs.readFileSync(env.ASHEN_TEST_MARKER, 'utf8'));
  assert.equal(m.ok, true, JSON.stringify(m));
  assert.equal(m.game, path.join(dir, 'data', 'game', 'versions', '2.0.0', 'index.html'));
  assert.equal(m.profile, path.join(dir, 'data', 'userdata', 'profile'));
  assert.equal(fs.realpathSync(m.cwd), fs.realpathSync(path.join(dir, 'data', 'game', 'versions', '2.0.0')));
  assert.equal(win.visible, false, 'launcher hidden while the game runs');
  assert.ok(st.tray && /playing/.test(st.tray.tip), 'tray icon while playing');
  const again = await st.handlers['launcher:play'](ok);
  assert.equal(again.ok, false, 'second Play while running is refused');
  await until(async () => (await st.handlers['launcher:get-state'](ok)).phase === 'ready');

  const L0 = await st.handlers['launcher:location'](ok);
  assert.equal(L0.root, path.join(dir, 'data')); assert.equal(L0.ask, false, 'no drive question when the data folder is fixed');
  assert.equal((await st.handlers['launcher:set-location'](ok, { drive: '../evil' })).ok, false, 'bad drive refused');
  assert.equal((await st.handlers['launcher:set-location'](ok, { keep: true })).restarting, false);
  await until(() => win.visible === true);
  assert.ok(st.tray, 'tray stays while hosting');
  const launchedArgs = JSON.parse(fs.readFileSync(env.ASHEN_TEST_MARKER, 'utf8')).argv;
  assert.ok(launchedArgs.includes('--ashen-mp') && launchedArgs[launchedArgs.indexOf('--ashen-mp') + 1] === mps.server, 'the game got the relay address');
  await st.handlers['launcher:mp-set'](ok, { mode: 'off' });
  assert.equal(st.tray, null, 'no tray once not hosting and not playing');
  await st.handlers['launcher:release-page'](ok);
  assert.match(st.opened, /^https:\/\/github\.com\/Noggin-Homevader\/Ashen-Descent\/releases/);
  win.webContents.emit('will-navigate', { preventDefault() { this.prevented = true; } });
});

test('main process: game host serves only the install folder and keeps saves in the profile', async () => {
  const dir = tmpDir('host');
  const gameDir = path.join(dir, 'versions', '2.0.0');
  fs.mkdirSync(gameDir, { recursive: true });
  fs.writeFileSync(path.join(gameDir, 'index.html'), '<html>ok</html>');
  fs.writeFileSync(path.join(dir, 'secret.txt'), 'outside');
  const profile = path.join(dir, 'profile');
  const { st, electron } = stubElectron({ appPath: dir });
  st.tmp = dir;
  let served = null;
  electron.net.fetch = async (u) => { served = u; return new Response('x'); };
  const cwd = process.cwd();
  process.chdir(gameDir);
  try {
    withElectron(electron, () => require('../src/main/game-host').run(['electron', '--ashen-game', path.join(gameDir, 'index.html'), '--ashen-profile', profile], 1));
  } finally { process.chdir(cwd); }
  await until(() => st.windows.length === 1);
  const win = st.windows[0];
  assert.equal(win.url, 'ashen-game://app/index.html');
  assert.equal(electron.app.paths.userData, profile, 'browser storage (saves) lives in userdata/profile');
  assert.equal(win.opts.webPreferences.backgroundThrottling, false);
  assert.equal(st.schemes[0].scheme, 'ashen-game');

  let res = await st.protocol({ url: 'ashen-game://app/index.html' });
  assert.equal(res.status, 200);
  assert.ok(served.endsWith('/versions/2.0.0/index.html'));
  for (const u of ['ashen-game://app/%2e%2e%2f%2e%2e%2fsecret.txt', 'ashen-game://app/..%2F..%2Fsecret.txt', 'ashen-game://other/index.html']) {
    served = null;
    res = await st.protocol({ url: u });
    assert.ok(res.status === 403 || res.status === 404, `${u} -> ${res.status}`);
    assert.equal(served, null, `${u} must not be served`);
  }
  // Only harmless permissions are granted to the game page.
  const ask = (p) => new Promise((r) => st.perms(null, p, r));
  assert.equal(await ask('pointerLock'), true);
  assert.equal(await ask('geolocation'), false);
  assert.equal(await ask('media'), false);
});
