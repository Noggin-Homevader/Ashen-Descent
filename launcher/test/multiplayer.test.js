'use strict';
/** The multiplayer relay, the game-side client, and the room API the game page sees, end to end. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');
const { createRelayServer } = require('../src/core/relay');
const { RoomClient } = require('../src/core/room-client');
const ws = require('../src/core/ws');

const until = async (cond, ms = 5000) => { const t = Date.now(); while (!(await cond())) { if (Date.now() - t > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 15)); } };

async function startRelay(opts) {
  const srv = createRelayServer(opts);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { srv, url: `ws://127.0.0.1:${srv.address().port}`, stop: () => new Promise((r) => { srv.relay.close(); srv.close(() => r()); for (const c of srv.relay.clients) c.ws.terminate(); }) };
}

test('ws: framing round trip, large and fragmented messages, size limit', async (t) => {
  const http = require('http');
  const srv = http.createServer();
  let serverConn;
  const socks = new Set();
  srv.on('upgrade', (req, sock, head) => { socks.add(sock); serverConn = ws.acceptUpgrade(req, sock, head, { maxPayload: 100000 }); if (serverConn) serverConn.on('message', (m) => serverConn.send(`echo:${m}`)); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  t.after(() => { for (const s2 of socks) s2.destroy(); srv.closeAllConnections?.(); srv.close(); });
  const c = await ws.connect(`ws://127.0.0.1:${srv.address().port}/`);
  const got = [];
  c.on('message', (m) => got.push(m));
  const big = 'x'.repeat(70000); // 64-bit length frame
  c.send('hello'); c.send('héllo ⚔'); c.send(big);
  await until(() => got.length === 3);
  assert.deepEqual(got.slice(0, 2), ['echo:hello', 'echo:héllo ⚔']);
  assert.equal(got[2].length, 70005);
  // A message over the limit closes the connection with 1009.
  let code;
  serverConn.on('close', (cd) => { code = cd; });
  c.send('y'.repeat(100001));
  await until(() => code !== undefined);
  assert.ok([1009, 1006].includes(code));
  // Not a valid WebSocket handshake (wrong version): plain 400.
  const raw = await new Promise((resolve) => {
    const s2 = require('net').connect(srv.address().port, '127.0.0.1', () => s2.write('GET / HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 8\r\nSec-WebSocket-Key: AAAAAAAAAAAAAAAAAAAAAA==\r\n\r\n'));
    let d = ''; s2.on('data', (x) => { d += x; }); s2.on('close', () => resolve(d)); setTimeout(() => { s2.destroy(); resolve(d); }, 1000);
  });
  assert.match(raw, /^HTTP\/1\.1 400/);
});

test('relay + client: lobby, party rooms, presence, events, leaving', async (t) => {
  const r = await startRelay(); t.after(r.stop);
  const a = new RoomClient({ url: r.url }), b = new RoomClient({ url: r.url });
  t.after(() => { a.stop(); b.stop(); });
  const msgsB = [], peersA = [];
  b.on('msg', (room, m) => msgsB.push([room, m]));
  a.on('peers', (room, ch) => peersA.push([room, ch]));
  a.start(); b.start();
  await Promise.all([a.join('lobby'), b.join('lobby')]);
  await until(() => a.peers('lobby').length === 2 && b.peers('lobby').length === 2);
  const me = a.peers('lobby').find((p) => p.isMe);
  assert.equal(me.sameTab, true); assert.equal(me.kind, 'viewer'); assert.equal(me.by, null);

  // Party room, like the game's 'adp-<code>'.
  await a.join('adp-k3v9');
  a.presence('adp-k3v9', { v: 1, n: 'Jaspu', ho: 1, x: 100, j: 1 });
  await b.join('adp-k3v9');
  await until(() => b.peers('adp-k3v9').some((p) => p.presence.n === 'Jaspu'));
  const host = b.peers('adp-k3v9').find((p) => p.presence.ho === 1);
  assert.equal(host.peer, a.peerId, 'the same peer id in lobby and party');
  // Merge and delete fields.
  a.presence('adp-k3v9', { x: 140, ho: null });
  await until(() => { const p = b.peers('adp-k3v9').find((q) => q.peer === a.peerId); return p.presence.x === 140 && !('ho' in p.presence); });
  // Events reach everyone, sender included (echo).
  const msgsA = [];
  a.on('msg', (room, m) => msgsA.push([room, m]));
  a.emitTo('adp-k3v9', 'snap', { f: 1, e: [[1, 2, 3]] });
  await until(() => msgsB.some(([room]) => room === 'adp-k3v9') && msgsA.length);
  const [, mb] = msgsB.find(([room]) => room === 'adp-k3v9');
  assert.deepEqual(mb.data, { f: 1, e: [[1, 2, 3]] }); assert.equal(mb.peer, a.peerId); assert.equal(mb.isMe, false); assert.equal(mb.topic, 'snap');
  assert.equal(msgsA[0][1].isMe, true);
  // Lobby events do not reach party listeners and vice versa.
  b.emitTo('lobby', 'inv', { to: a.peerId, code: 'k3v9' });
  await until(() => msgsA.some(([room, m]) => room === 'lobby' && m.topic === 'inv'));
  // Leaving: the other side sees 'left'.
  await b.leave('adp-k3v9');
  await until(() => a.peers('adp-k3v9').length === 1);
  assert.ok(peersA.some(([room, ch]) => room === 'adp-k3v9' && ch.left.length === 1));
});

test('relay: limits are enforced (size, names, rate, room size)', async (t) => {
  const r = await startRelay({ limits: { peersPerRoom: 2, burst: 10, rate: 5 } }); t.after(r.stop);
  const c = await ws.connect(r.url);
  const got = [];
  c.on('message', (m) => got.push(JSON.parse(m)));
  const send = (o) => c.send(JSON.stringify(o));
  send({ t: 'join', id: 1, room: 'lobby' });
  await until(() => got.length);
  assert.equal(got[0].t, 'err', 'must say hello first');
  send({ t: 'hello', v: 1 });
  send({ t: 'join', id: 2, room: 'Bad Room!' });
  send({ t: 'join', id: 3, room: 'adp-x' });
  await until(() => got.some((m) => m.id === 3));
  assert.equal(got.find((m) => m.id === 2).code, 'invalid_argument');
  send({ t: 'presence', id: 4, room: 'adp-x', patch: { big: 'z'.repeat(5000) } });
  send({ t: 'emit', id: 5, room: 'adp-x', topic: 'snap', data: 'z'.repeat(5000) });
  send({ t: 'emit', id: 6, room: 'adp-x', topic: 'Bad:Topic', data: 1 });
  await until(() => [4, 5, 6].every((i) => got.some((m) => m.id === i)));
  for (const i of [4, 5, 6]) assert.equal(got.find((m) => m.id === i).code, 'invalid_argument');
  // Rate: 30 emits at once, only the burst gets through.
  for (let i = 0; i < 30; i++) send({ t: 'emit', room: 'adp-x', topic: 'snap', data: i });
  await new Promise((res) => setTimeout(res, 300));
  const echoed = got.filter((m) => m.t === 'msg').length;
  assert.ok(echoed >= 5 && echoed <= 12, `rate limited to the burst, got ${echoed}`);
  // Room size.
  const x = new RoomClient({ url: r.url }), y = new RoomClient({ url: r.url }); x.start(); y.start();
  t.after(() => { x.stop(); y.stop(); });
  await x.join('adp-x');
  await assert.rejects(y.join('adp-x'), /full/);
});

test('client: reconnects after the relay restarts and rejoins with the same id and presence', async (t) => {
  let r = await startRelay();
  const port = r.srv.address().port;
  const a = new RoomClient({ url: r.url, backoff: [50, 100, 200] }), b = new RoomClient({ url: r.url, backoff: [50, 100, 200] });
  t.after(() => { a.stop(); b.stop(); });
  const conn = [];
  a.on('conn', (c) => conn.push(c));
  a.start(); b.start();
  await a.join('adp-q1'); await b.join('adp-q1');
  a.presence('adp-q1', { n: 'Ash', hp: 50 });
  await until(() => b.peers('adp-q1').some((p) => p.presence.n === 'Ash'));
  const idA = a.peerId;
  // Drop A's connection only: it resumes its old peer id.
  [...r.srv.relay.clients].find((c) => c.peer === idA).ws.terminate();
  await until(() => conn.includes(false) && conn.at(-1) === true);
  assert.equal(a.peerId, idA, 'same id after a reconnect');
  await until(() => b.peers('adp-q1').some((p) => p.peer === idA && p.presence.hp === 50), 5000);
  // Whole relay restarts (as on a server redeploy): both come back into the room.
  await r.stop();
  await until(() => !a.connected);
  const srv2 = createRelayServer();
  await new Promise((res) => srv2.listen(port, '127.0.0.1', res));
  t.after(() => new Promise((res) => { srv2.relay.close(); for (const c of srv2.relay.clients) c.ws.terminate(); srv2.close(() => res()); }));
  await until(() => a.connected && b.connected, 8000);
  await until(() => b.peers('adp-q1').some((p) => p.presence.n === 'Ash') && a.peers('adp-q1').length === 2, 5000);
});

test('game window: the room API the game uses works across two desktop games', async (t) => {
  const r = await startRelay(); t.after(r.stop);
  // Load game-host + game-preload for a "player" against a stand-in Electron, wiring IPC between them.
  function player() {
    const main = new Map(), pageListeners = new Map(), exposed = {};
    const webContents = { send: (ch, ...a) => { for (const f of pageListeners.get(ch) || []) f({}, ...a); } };
    const win = Object.assign(new EventEmitter(), { webContents, once() {}, loadURL() {}, isDestroyed: () => false, maximize() {}, show() {}, focus() {} });
    webContents.on = () => {}; webContents.once = () => {}; webContents.setWindowOpenHandler = () => {};
    const stub = {
      app: { setPath() {}, setName() {}, requestSingleInstanceLock: () => true, on() {}, quit() {}, exit() {}, getPath: () => '/tmp', whenReady: () => Promise.resolve() },
      BrowserWindow: function () { return win; },
      protocol: { registerSchemesAsPrivileged() {}, handle() {} }, net: { fetch() {} }, shell: {}, Menu: { setApplicationMenu() {} },
      session: { defaultSession: { setPermissionRequestHandler() {} } },
      ipcMain: { handle: (ch, f) => main.set(ch, f), once() {} },
      contextBridge: { exposeInMainWorld: (k, v) => { exposed[k] = v; } },
      ipcRenderer: {
        invoke: async (ch, ...a) => JSON.parse(JSON.stringify((await main.get(ch)({ sender: webContents }, ...a)) ?? null)),
        on: (ch, f) => { if (!pageListeners.has(ch)) pageListeners.set(ch, []); pageListeners.get(ch).push((e, ...a) => f(e, ...JSON.parse(JSON.stringify(a)))); },
        removeListener() {},
      },
    };
    const orig = Module._load;
    Module._load = function (req, ...rest) { return req === 'electron' ? stub : orig.call(this, req, ...rest); };
    for (const k of Object.keys(require.cache)) if (k.includes(`${path.sep}src${path.sep}main${path.sep}`)) delete require.cache[k];
    const argv0 = process.argv;
    try {
      const fs = require('fs'); const dir = require('./helpers').tmpDir('gh'); fs.writeFileSync(path.join(dir, 'index.html'), 'x');
      require('../src/main/game-host').run(['electron', '--ashen-game', path.join(dir, 'index.html'), '--ashen-profile', dir, '--ashen-mp', r.url], 1);
      process.argv = [...argv0, '--ashen-mp=1'];
      require('../src/main/game-preload');
    } finally { Module._load = orig; process.argv = argv0; }
    return { exposed, main };
  }
  const A = player();
  await until(() => A.main.has('room:use'));
  const B = player();
  await until(() => B.main.has('room:use'));
  const roomA = await A.exposed.claude.use('room'), roomB = await B.exposed.claude.use('room');
  t.after(async () => { await A.main.get('room:leave')({ sender: undefined }).catch(() => {}); });
  assert.ok(roomA && roomB);
  assert.equal(await A.exposed.claude.use('db'), null, 'other capabilities are not offered');
  const conns = [];
  roomA.onConnection((c) => conns.push(c));
  await until(() => roomA.connected() && roomB.connected());
  await until(() => roomA.peers().length === 2);
  const meA = roomA.peers().find((p) => p.isMe && p.sameTab);
  assert.ok(meA && Object.isFrozen(roomA.peers()));
  // Invite in the lobby, like mpInvite().
  const inv = [];
  roomB.on('inv', (m) => inv.push(m));
  await roomA.emit('inv', { to: roomB.peers().find((p) => p.isMe).peer, code: 'k3v9', from: 'Jaspu' });
  await until(() => inv.length === 1);
  assert.equal(inv[0].peer, meA.peer); assert.equal(inv[0].data.code, 'k3v9');
  // Party: create, join, presence, game events, leave.
  const pA = await roomA.join('adp-k3v9');
  await pA.presence({ v: 1, n: 'Jaspu', ho: 1, j: 1 });
  const pB = await roomB.join('adp-k3v9');
  const changes = [];
  pB.onPeers((ch) => changes.push(ch));
  await until(() => pB.peers().some((p) => p.presence.ho === 1));
  assert.equal(changes[0].joined.length >= 1, true, 'first onPeers call presents the room');
  const snaps = [];
  pB.on('snap', (m) => snaps.push(m));
  await pA.emit('snap', { f: 7 });
  await until(() => snaps.length === 1);
  assert.equal(snaps[0].data.f, 7); assert.equal(snaps[0].isMe, false);
  await assert.rejects(pA.emit('Bad Topic', 1), /bad topic/);
  await assert.rejects(pA.presence({ huge: 'x'.repeat(5000) }), /4 KiB/);
  await pB.leave();
  await until(() => pA.peers().length === 1);
  assert.ok(conns.includes(true));
});

test('launcher multiplayer helpers: addresses, health, online server list, hosting', async (t) => {
  const mp = require('../src/core/multiplayer');
  assert.equal(mp.joinUrl('192.168.1.20'), 'ws://192.168.1.20:47130');
  assert.equal(mp.joinUrl(' pc.local:5000 '), 'ws://pc.local:5000');
  assert.equal(mp.joinUrl('wss://relay.example.com'), 'wss://relay.example.com');
  assert.equal(mp.joinUrl(''), null);
  assert.equal(mp.joinUrl('http://x y'), null);
  assert.equal(mp.validServerUrl('wss://ashen.onrender.com'), true);
  assert.equal(mp.validServerUrl('ws://evil.example.com'), false, 'remote servers must use wss');
  assert.equal(mp.validServerUrl('ws://127.0.0.1:47130'), true);
  assert.ok(Array.isArray(mp.lanAddresses()));

  const host = new mp.LocalHost({ port: 0 });
  await host.start();
  t.after(() => host.stop());
  assert.equal(host.running, true);
  const h = await mp.health(fetch, `ws://127.0.0.1:${host.port}`);
  assert.deepEqual(h, { ok: true, players: 0 });
  const c = new RoomClient({ url: `ws://127.0.0.1:${host.port}` }); c.start(); t.after(() => c.stop());
  await c.join('lobby');
  assert.equal(host.players, 1);
  // A second host on the same port reports a clear error instead of crashing.
  const clash = new mp.LocalHost({ port: host.port });
  await clash.start();
  assert.equal(clash.running, false); assert.match(clash.error, /already in use/);
  assert.equal((await mp.health(fetch, 'ws://127.0.0.1:1')).ok, false);

  const cfg = { github: { owner: 'o', repo: 'r' }, multiplayer: { serverUrl: 'wss://fallback.example.com' } };
  const fake = (body, ok = true) => async () => ({ ok, json: async () => body });
  assert.deepEqual(await mp.onlineServer(fake({ servers: [{ name: 'EU', url: 'wss://eu.example.com' }] }), cfg), { url: 'wss://eu.example.com', name: 'EU' });
  assert.deepEqual(await mp.onlineServer(fake({ servers: [{ url: 'ws://insecure.example.com' }] }), cfg), { url: 'wss://fallback.example.com', name: 'Ashen Descent server' });
  assert.deepEqual(await mp.onlineServer(async () => { throw new Error('offline'); }, cfg), { url: 'wss://fallback.example.com', name: 'Ashen Descent server' });
  assert.equal(await mp.onlineServer(fake({ servers: [] }), { github: { owner: 'o', repo: 'r' } }), null);
});
