'use strict';
/**
 * Visual and behavioural check of the launcher page, without Electron: the real renderer files are opened in
 * Chromium (Playwright), wired to the real Updater, which talks to a local fake of GitHub and launches a
 * stand-in game. It saves a screenshot of every state and clicks the real Play button.
 *
 *   node launcher/test/ui/ui-check.js [outDir]       (needs the "playwright" package and its Chromium)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/npm-tools/node_modules/playwright'); }
const { Updater } = require('../../src/core/updater');
const { Settings } = require('../../src/core/config');
const { FakeGitHub, makePackage, tmpDir, webRuntime, waitFor } = require('../helpers');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'out'));
const PAGE = path.join(__dirname, '..', '..', 'src', 'renderer', 'index.html');
const NOTES = `## Ashen Descent 2.0 — The Deep Gate opens

- **Stone portals** rebuilt as rune-scribed voussoir gates
- New **rune index** with 26 original Ashen runes
- Spells now flow like the shield domes: whirlpools, fire rings, storms
- Buffs and debuffs panel you can move in the HUD
- Party play: fewer desyncs, monsters appear for everyone at once

### Fixes
- Casting circle no longer mirrors away from your hero
- Saves are validated and repaired on load`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const gh = await new FakeGitHub().start();
  const pkg = makePackage('2.0.0', { 'index.html': '<html>Ashen Descent 2.0.0</html>', 'data/blob.bin': crypto.randomBytes(2_400_000).toString('base64') });
  gh.addRelease('2.0.0', [pkg], { notes: NOTES });
  const root = tmpDir('ui');
  const marker = path.join(root, 'launched.json');
  process.env.ASHEN_TEST_MARKER = marker; process.env.ASHEN_TEST_GAME_MS = '2500';

  const mkUpdater = () => new Updater({
    config: gh.config({ requestTimeoutMs: 4000 }), root, fetch, platform: { os: 'windows', arch: 'x64' }, launcherVersion: '1.0.0',
    settings: new Settings(path.join(root, 'launcher', 'settings.json')).load(), webRuntime, retryDelays: [50],
    installerHooks: { phase: (n) => (n === 'extracted' ? new Promise((r) => setTimeout(r, 1500)) : null) },
  });
  let updater = mkUpdater();

  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 740 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const fontsBundled = fs.existsSync(path.join(PAGE, '..', 'fonts', 'Almendra-Regular.ttf'));
  page.on('requestfailed', (r) => { if (!(r.url().includes('/fonts/') && !fontsBundled)) errors.push(`request failed: ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
  await page.exposeFunction('__ashenCall', async (name, arg) => {
    switch (name) {
      case 'getState': return updater.state;
      case 'retry': updater.retry(); return null;
      case 'play': try { await updater.play(); return { ok: true }; } catch (e) { return { ok: false, error: require('../../src/core/errors').describeError(e) }; }
      case 'setAllowPrerelease': await updater.setAllowPrerelease(arg); return null;
      default: return null;
    }
  });
  await page.addInitScript(() => {
    const subs = [];
    window.__ashenPush = (s) => subs.forEach((f) => f(s));
    window.ashen = {
      platform: 'win32',
      getState: () => window.__ashenCall('getState'), onState: (f) => { subs.push(f); return () => {}; }, onClosing: () => {},
      retry: () => window.__ashenCall('retry'), play: () => window.__ashenCall('play'),
      setAllowPrerelease: (on) => window.__ashenCall('setAllowPrerelease', on),
      open: () => null, openReleasePage: () => null, minimize: () => null, close: () => null,
      getLocation: async () => window.__mockLoc || { root: '/data/Ashen Descent', source: 'default', ask: false, installed: true, drives: [] },
      setLocation: async (c) => { window.__locSent = c; return { ok: true, restarting: true }; }, onLocationProgress: () => {},
      getMultiplayer: async () => window.__mockMp || { mode: 'online', join: '', server: 'wss://ashen-relay.onrender.com', online: { name: 'Ashen Descent server', url: 'wss://ashen-relay.onrender.com', status: { ok: true, players: 7 } }, host: { running: false, port: 47130, players: 0, addresses: ['192.168.1.20'] } },
      setMultiplayer: async (o) => { window.__mpSent = o; const m = { mode: o.mode, join: o.join, server: 'ws://127.0.0.1:47130', online: null, host: { running: o.mode === 'host', port: 47130, players: 2, addresses: ['192.168.1.20', '100.88.12.4'] } }; window.__mockMp = m; return m; },
      onMultiplayer: () => {},
    };
  });
  const wire = (u) => u.on('state', (s) => page.evaluate((st) => window.__ashenPush(st), s).catch(() => {}));
  wire(updater);
  await page.goto(`file://${PAGE}`);
  const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('shot', name); };

  // 1. Checking (GitHub answers slowly so the state can be seen)
  gh.mode.slowBps = 900_000;
  const origHandle = gh._handle.bind(gh);
  let delayApi = 1500;
  gh._handle = (q, s) => (q.url.includes('/releases') && delayApi ? setTimeout(() => origHandle(q, s), delayApi) : origHandle(q, s));
  const run = updater.start();
  await waitFor(updater, (s) => s.phase === 'checking');
  await shot('1-checking');
  // 2. Downloading, with size and speed
  await waitFor(updater, (s) => s.phase === 'downloading' && s.progress && s.progress.fraction > 0.35, 30000);
  await shot('2-downloading');
  // 3. Installing / verifying
  await waitFor(updater, (s) => s.phase === 'installing', 30000);
  await shot('3-installing');
  await run;
  delayApi = 0; gh.mode.slowBps = 0;
  // 4. Ready to play
  await shot('4-ready');
  // 5. Click Play: the real button starts the stand-in game; the launcher shows it running
  await page.click('#play');
  await waitFor(updater, (s) => s.phase === 'running');
  await shot('5-running');
  const launched = JSON.parse(fs.readFileSync(marker, 'utf8'));
  if (!launched.entryExists) throw new Error('game entry missing');
  console.log('launched game process', launched.pid, 'cwd', launched.cwd);
  // ...and returns to ready when the game exits
  await waitFor(updater, (s) => s.phase === 'ready', 15000);
  // 6. Offline with a working install
  gh.mode.offline = true;
  updater = mkUpdater(); wire(updater); await updater.start(); await page.evaluate((s) => window.__ashenPush(s), updater.state);
  await shot('6-offline-ready');
  // 7. Failed with nothing installed
  const root2 = tmpDir('ui2');
  updater = new Updater({ config: gh.config({ requestTimeoutMs: 2000 }), root: root2, fetch, platform: { os: 'windows', arch: 'x64' }, launcherVersion: '1.0.0', webRuntime });
  wire(updater); await updater.start(); await page.evaluate((s) => window.__ashenPush(s), updater.state);
  await shot('7-failed');
  // 7b. First-run drive picker (Windows): C: nearly full, so D: is suggested; E: has too little room.
  await page.addInitScript(() => {
    const GB = 1024 ** 3, C = 'C:\\Users\\Jaspu\\AppData\\Roaming\\Ashen Descent';
    window.__mockLoc = { root: C, source: 'default', ask: true, installed: false, platform: 'win32', drives: [
      { letter: 'C:', free: 1.2 * GB, total: 237 * GB, system: true, root: C },
      { letter: 'D:', free: 812 * GB, total: 931 * GB, system: false, root: 'D:\\Ashen Descent' },
      { letter: 'E:', free: 0.2 * GB, total: 64 * GB, system: false, root: 'E:\\Ashen Descent' }] };
  });
  await page.reload();
  await page.waitForSelector('#loc:not([hidden])');
  await shot('7b-drive-picker');
  const suggested = await page.textContent('#locPath');
  if (suggested !== 'D:\\Ashen Descent') throw new Error(`drive picker should suggest D: when C: is nearly full, got ${suggested}`);
  if (!(await page.isDisabled('.drv.low'))) throw new Error('a drive without room should not be selectable');
  await page.click('#locOk');
  const sent = await page.evaluate(() => window.__locSent);
  if (!sent || sent.drive !== 'D:') throw new Error(`expected the launcher to be asked for D:, got ${JSON.stringify(sent)}`);
  await shot('7c-drive-restarting');
  await page.evaluate(() => { document.getElementById('loc').hidden = true; });
  // 7d. Party play settings: online status, then switch to hosting.
  await page.click('#mpChange');
  await page.waitForSelector('#mpd:not([hidden])');
  await shot('7d-party-online');
  await page.click('.mpc[data-mode="host"]');
  await page.click('#mpSave');
  const mpSent = await page.evaluate(() => window.__mpSent);
  if (!mpSent || mpSent.mode !== 'host') throw new Error('party mode not sent');
  await page.click('#mpChange');
  await shot('7e-party-hosting');
  await page.click('.mpc[data-mode="join"]');
  await page.fill('#mpJoin', '192.168.1.20');
  await shot('7f-party-join');
  await page.click('#mpCancel');
  // 8. Narrow window
  await page.setViewportSize({ width: 940, height: 620 });
  await shot('8-small-window');

  await browser.close();
  await gh.stop();
  if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('UI check passed; screenshots in', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
