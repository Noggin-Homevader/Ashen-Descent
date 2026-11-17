'use strict';
/**
 * Party play with the real game: two game windows (Chromium pages running game/app/index.html) talk through the
 * real game-window bridge (game-preload.js), the real RoomClient and the real relay. The leader makes a party, the
 * second player joins it by code, the leader opens the portal, and both must end up in the same dungeon run.
 *
 *   node launcher/test/ui/party-check.js [game.html] [outDir]     (needs playwright + Chromium)
 */
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/npm-tools/node_modules/playwright'); }
const { createRelayServer } = require('../../src/core/relay');
const { createRoomBridge } = require('../../src/core/room-bridge');

const GAME = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '..', 'game', 'app', 'index.html'));
const OUT = path.resolve(process.argv[3] || path.join(__dirname, 'out'));
const PRELOAD = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'main', 'game-preload.js'), 'utf8');

async function player(launch, url, name, cls) {
  // A browser each: software 3D in one would starve the other's page.
  const browser = await launch();
  BROWSERS.push(browser);
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  await page.route(/^https?:\/\//, (r) => r.abort()); // web fonts etc.: not needed offline, and must not stall the test
  page.on('pageerror', (e) => errors.push(String(e)));
  const bridge = createRoomBridge({ url, send: (ch, ...a) => page.evaluate(([c, x]) => window.__ipcEmit && window.__ipcEmit(c, x), [ch, a]).catch(() => {}) });
  await page.exposeFunction('__ipcInvoke', (ch, ...a) => bridge.handlers[ch](...a));
  // The preload as Electron would run it, with ipcRenderer/contextBridge mapped onto this page.
  await page.addInitScript(({ src, name: nm }) => {
    const listeners = {};
    window.__ipcEmit = (ch, args) => { for (const f of listeners[ch] || []) f({}, ...args); };
    const electron = {
      contextBridge: { exposeInMainWorld: (k, v) => { window[k] = v; } },
      ipcRenderer: { invoke: (ch, ...a) => window.__ipcInvoke(ch, ...a), on: (ch, f) => { (listeners[ch] = listeners[ch] || []).push(f); }, removeListener() {} },
    };
    // eslint-disable-next-line no-new-func
    new Function('require', 'process', src)(() => electron, { argv: ['electron', '--ashen-mp=1'] });
    try { if (!localStorage.getItem('ad_acct')) localStorage.setItem('ad_acct', JSON.stringify({ id: `AD-${nm.toUpperCase()}`, cr: Date.now(), name: nm })); } catch (e) {}
  }, { src: PRELOAD, name });
  const t0 = Date.now();
  await page.goto(`file://${GAME}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`${name}: game loaded in ${Date.now() - t0} ms`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const s = document.getElementById('splash'); if (s) s.click(); });
  await page.waitForTimeout(400);
  for (const t of ['New character', ...cls, 'Enter camp']) {
    const b = page.locator('button:visible', { hasText: t }).first();
    if (await b.count()) { await b.evaluate((x) => x.click()); await page.waitForTimeout(450); }
  }
  await page.waitForTimeout(1200);
  if (!(await page.evaluate(() => typeof P !== 'undefined' && !!P && camp))) throw new Error(`${name} did not reach camp`);
  return { page, bridge, errors };
}

const DIAG = () => JSON.stringify({ msg: MP.msg, party: MP.party && { code: MP.party.code, host: MP.party.host, n: mpPartyPeers().length, rmPeers: MP.party.rm && MP.party.rm.peers().map((p) => [p.peer, p.isMe, JSON.stringify(p.presence).slice(0, 80)]) }, myPeer: MP.myPeer, lobby: MP.room && MP.room.peers().map((p) => p.peer), pend: MP.pendJoin, run: !!MP.run, camp: typeof camp !== 'undefined' && camp });
let PAGES = [];
const BROWSERS = [];
const waitFor = async (page, fn, arg, ms = 20000) => {
  try { return await page.waitForFunction(fn, arg, { timeout: ms, polling: 200 }); } catch (e) {
    for (const [i, pg] of PAGES.entries()) console.error(`player ${i + 1}:`, await pg.evaluate(DIAG).catch((x) => x.message));
    throw e;
  }
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = createRelayServer();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `ws://127.0.0.1:${srv.address().port}`;
  const launch = () => playwright.chromium.launch({ executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const A = await player(launch, url, 'Jaspu', ['Tank', 'Tidebinder']);
    const B = await player(launch, url, 'Ember', ['Tank', 'Tidebinder']);
    PAGES = [A.page, B.page];
    // Both see the multiplayer service as available and connected.
    await waitFor(A.page, () => typeof MP !== 'undefined' && MP.ok && MP.room && MP.room.connected());
    await waitFor(B.page, () => typeof MP !== 'undefined' && MP.ok && MP.room && MP.room.connected());
    await waitFor(A.page, () => MP.room.peers().length >= 2);
    console.log('lobby: both players connected');

    // Leader makes a party; the friend joins with the code.
    await A.page.evaluate(() => mpMake(true));
    const code = await A.page.evaluate(async () => { for (let i = 0; i < 50 && !(MP.party && MP.party.code); i++) await new Promise((r) => setTimeout(r, 100)); return MP.party && MP.party.code; });
    if (!code) throw new Error('party not created');
    console.log('party code', code);
    await B.page.evaluate((c) => mpJoin(c), code);
    await waitFor(B.page, () => MP.party && mpPartyPeers().length === 2);
    await waitFor(A.page, () => MP.party && mpPartyPeers().length === 2);
    const names = await A.page.evaluate(() => mpRows().map((r) => r.n));
    console.log('party rows on the leader:', names.join(', '));
    await A.page.screenshot({ path: path.join(OUT, 'party-1-camp.png') });

    // Leader opens the portal: the run starts for both.
    await waitFor(A.page, () => mpPlayers().some((p) => p.presence.cp == 1), null, 15000).catch(() => {});
    const started = await A.page.evaluate(() => mpPortal());
    if (!started) throw new Error('the leader could not start the run (is the second player marked ready in camp?)');
    await waitFor(B.page, () => !!MP.run && !camp, null, 25000);
    const a = await A.page.evaluate(() => ({ fl, run: !!MP.run, host: MP.run && MP.run.host, enemies: E.length }));
    await B.page.waitForTimeout(3000);
    const b = await B.page.evaluate(() => ({ fl, run: !!MP.run, host: MP.run && MP.run.host, enemies: E.length, leaderSeen: Object.keys(MP.gh || {}).length }));
    console.log('leader', JSON.stringify(a), 'friend', JSON.stringify(b));
    if (a.fl !== b.fl || !b.run || b.host) throw new Error('the friend is not in the leader\'s run');
    if (!b.enemies) throw new Error('the friend sees no monsters');
    await A.page.screenshot({ path: path.join(OUT, 'party-2-leader.png') });
    await B.page.screenshot({ path: path.join(OUT, 'party-3-friend.png') });
    const errs = [...A.errors, ...B.errors];
    if (errs.length) throw new Error(`page errors: ${errs.slice(0, 3).join(' | ')}`);
    console.log('PARTY CHECK PASSED');
    A.bridge.stop(); B.bridge.stop();
  } finally {
    for (const b of BROWSERS) await b.close().catch(() => {});
    srv.relay.close(); for (const c of srv.relay.clients) c.ws.terminate(); srv.close();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
