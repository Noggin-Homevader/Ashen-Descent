'use strict';
/**
 * The Ashen Descent multiplayer relay.
 *
 * It recreates the real-time "room" service the game uses when it runs as a Claude artifact: everyone connected
 * shares a lobby, parties join named rooms ("adp-<code>"), each player keeps a small presence object (position,
 * health, gear...) that the relay shares with the room, and game events ("snap", "dmg", "sys"...) are passed to
 * everyone in the room, sender included. The relay keeps nothing on disk and runs game logic for no one; the
 * party leader's game stays in charge, exactly as in the browser version.
 *
 * Runs in two places with the same code: inside the launcher ("Host on this PC") and as a standalone server
 * (server/index.js, e.g. on Render).
 *
 * Protocol: one JSON object per WebSocket text message.
 *   client -> relay: hello {v, resume?{peer,token}} | join {id, room} | leave {id, room}
 *                    presence {room, patch} | emit {room, topic, data} | ping
 *   relay -> client: welcome {peer, token} | joined {id, room, peers[]} | left {id, room}
 *                    peer {room, ev: join|update|left, peer, presence?, updatedAt?} | msg {room, topic, peer, data}
 *                    err {id?, code, message} | pong
 */
const http = require('http');
const crypto = require('crypto');
const { acceptUpgrade } = require('./ws');

const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const TOPIC_RE = /^[a-z][a-z0-9_.-]{0,47}$/;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const LIMITS = { presenceBytes: 4096, dataBytes: 4096, roomsPerPeer: 8, peersPerRoom: 64, perIp: 16, maxConns: 2000, rate: 40, burst: 80, resumeMs: 10 * 60e3, idleMs: 45e3 };

const newPeer = () => crypto.randomBytes(10).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').padEnd(12, '0').slice(0, 14);
const bytes = (v) => Buffer.byteLength(JSON.stringify(v === undefined ? null : v), 'utf8');

class Relay {
  constructor({ log = () => {}, limits = {}, trustProxy = false } = {}) {
    this.log = log; this.L = { ...LIMITS, ...limits }; this.trustProxy = trustProxy;
    this.clients = new Set(); this.rooms = new Map(); this.byPeer = new Map(); this.resume = new Map(); this.ipCount = new Map();
    this.stats = { connections: 0, messages: 0, dropped: 0 };
    this.timer = setInterval(() => this._sweep(), 15000);
    this.timer.unref?.();
  }

  get players() { return this.clients.size; }

  /** Attach to an http.Server's 'upgrade' event. */
  handleUpgrade(req, socket, head) {
    // Behind a hosting proxy (Render) the player's address is in X-Forwarded-For; trusted only when told so.
    const fwd = this.trustProxy ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
    const ip = fwd || req.socket.remoteAddress || '?';
    if (this.clients.size >= this.L.maxConns || (this.ipCount.get(ip) || 0) >= this.L.perIp) {
      try { socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); } catch {}
      return;
    }
    const ws = acceptUpgrade(req, socket, head, { maxPayload: 16 * 1024 });
    if (!ws) return;
    const c = { ws, ip, peer: null, token: null, rooms: new Map(), tokens: this.L.burst, last: Date.now(), seen: Date.now(), dropped: 0 };
    this.clients.add(c); this.ipCount.set(ip, (this.ipCount.get(ip) || 0) + 1); this.stats.connections++;
    ws.on('message', (m) => this._onMessage(c, m));
    ws.on('pong', () => { c.seen = Date.now(); });
    ws.on('close', () => this._drop(c));
    ws.on('error', () => {});
  }

  _send(c, obj) { if (c.ws.open) c.ws.send(JSON.stringify(obj)); }
  _err(c, id, code, message) { this._send(c, { t: 'err', id, code, message }); }

  _bucket(c) {
    const now = Date.now();
    c.tokens = Math.min(this.L.burst, c.tokens + ((now - c.last) / 1000) * this.L.rate); c.last = now;
    if (c.tokens < 1) { c.dropped++; this.stats.dropped++; return false; }
    c.tokens -= 1; return true;
  }

  _onMessage(c, raw) {
    c.seen = Date.now();
    let m;
    try { m = JSON.parse(raw); } catch { return this._err(c, null, 'invalid_argument', 'not JSON'); }
    if (!m || typeof m !== 'object') return;
    this.stats.messages++;
    if (m.t === 'ping') return this._send(c, { t: 'pong' });
    if (m.t === 'hello') return this._hello(c, m);
    if (!c.peer) return this._err(c, m.id, 'invalid_argument', 'say hello first');
    switch (m.t) {
      case 'join': return this._join(c, m);
      case 'leave': return this._leave(c, m.room, m.id);
      case 'presence': return this._presence(c, m);
      case 'emit': return this._emit(c, m);
      default: return this._err(c, m.id, 'invalid_argument', 'unknown message');
    }
  }

  _hello(c, m) {
    if (c.peer) return;
    const r = m.resume;
    if (r && typeof r.peer === 'string' && typeof r.token === 'string') {
      const saved = this.resume.get(r.peer);
      if (saved && saved.token === r.token && !this.byPeer.has(r.peer)) { c.peer = r.peer; c.token = r.token; this.resume.delete(r.peer); }
    }
    if (!c.peer) { do { c.peer = newPeer(); } while (this.byPeer.has(c.peer) || this.resume.has(c.peer)); c.token = crypto.randomBytes(18).toString('base64url'); }
    this.byPeer.set(c.peer, c);
    this._send(c, { t: 'welcome', peer: c.peer, token: c.token, limits: { presenceBytes: this.L.presenceBytes, dataBytes: this.L.dataBytes } });
  }

  _snapshot(name) {
    const room = this.rooms.get(name);
    return room ? [...room.values()].map((x) => ({ peer: x.c.peer, presence: x.presence, updatedAt: x.updatedAt })) : [];
  }

  _broadcast(name, obj, except) {
    const room = this.rooms.get(name);
    if (!room) return;
    const s = JSON.stringify(obj);
    for (const x of room.values()) if (x.c !== except && x.c.ws.open) x.c.ws.send(s);
  }

  _join(c, m) {
    const name = m.room;
    if (typeof name !== 'string' || !ROOM_RE.test(name)) return this._err(c, m.id, 'invalid_argument', 'bad room name');
    if (!c.rooms.has(name)) {
      if (c.rooms.size >= this.L.roomsPerPeer) return this._err(c, m.id, 'invalid_argument', 'too many rooms');
      let room = this.rooms.get(name);
      if (!room) { room = new Map(); this.rooms.set(name, room); }
      if (room.size >= this.L.peersPerRoom) return this._err(c, m.id, 'full', 'that room is full');
      const entry = { c, presence: {}, updatedAt: Date.now() };
      room.set(c.peer, entry); c.rooms.set(name, entry);
      this._broadcast(name, { t: 'peer', room: name, ev: 'join', peer: c.peer, presence: entry.presence, updatedAt: entry.updatedAt }, c);
    }
    this._send(c, { t: 'joined', id: m.id, room: name, peers: this._snapshot(name) });
  }

  _leave(c, name, id) {
    const room = this.rooms.get(name);
    if (c.rooms.delete(name) && room) {
      room.delete(c.peer);
      if (!room.size) this.rooms.delete(name);
      else this._broadcast(name, { t: 'peer', room: name, ev: 'left', peer: c.peer });
    }
    if (id !== undefined) this._send(c, { t: 'left', id, room: name });
  }

  _presence(c, m) {
    const e = c.rooms.get(m.room);
    if (!e) return this._err(c, m.id, 'invalid_argument', 'not in that room');
    const p = m.patch;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return this._err(c, m.id, 'invalid_argument', 'patch must be an object');
    if (!this._bucket(c)) return;
    const next = { ...e.presence };
    for (const [k, v] of Object.entries(p)) {
      if (!KEY_RE.test(k)) return this._err(c, m.id, 'invalid_argument', `bad presence key ${k}`);
      if (v === null) delete next[k]; else next[k] = v;
    }
    if (bytes(next) > this.L.presenceBytes) return this._err(c, m.id, 'invalid_argument', `presence over ${this.L.presenceBytes} bytes`);
    e.presence = next; e.updatedAt = Date.now();
    this._broadcast(m.room, { t: 'peer', room: m.room, ev: 'update', peer: c.peer, presence: next, updatedAt: e.updatedAt }, c);
  }

  _emit(c, m) {
    if (!c.rooms.has(m.room)) return this._err(c, m.id, 'invalid_argument', 'not in that room');
    if (typeof m.topic !== 'string' || !TOPIC_RE.test(m.topic)) return this._err(c, m.id, 'invalid_argument', 'bad topic');
    if (bytes(m.data) > this.L.dataBytes) return this._err(c, m.id, 'invalid_argument', `data over ${this.L.dataBytes} bytes`);
    if (!this._bucket(c)) return;
    this._broadcast(m.room, { t: 'msg', room: m.room, topic: m.topic, peer: c.peer, data: m.data === undefined ? null : m.data });
  }

  _drop(c) {
    if (!this.clients.delete(c)) return;
    const n = (this.ipCount.get(c.ip) || 1) - 1;
    if (n > 0) this.ipCount.set(c.ip, n); else this.ipCount.delete(c.ip);
    for (const name of [...c.rooms.keys()]) this._leave(c, name);
    if (c.peer) {
      this.byPeer.delete(c.peer);
      this.resume.set(c.peer, { token: c.token, until: Date.now() + this.L.resumeMs });
    }
  }

  _sweep() {
    const now = Date.now();
    for (const [p, r] of this.resume) if (r.until < now) this.resume.delete(p);
    for (const c of this.clients) {
      if (now - c.seen > this.L.idleMs) { c.ws.terminate(); continue; }
      c.ws.ping();
    }
  }

  close() {
    clearInterval(this.timer);
    for (const c of this.clients) c.ws.close(1001, 'server shutting down');
  }
}

/**
 * An HTTP server with the relay attached. GET /health answers with player counts (used to wake sleeping hosts and to
 * show "online" in the launcher); WebSocket connections are accepted on any path.
 */
function createRelayServer({ log, limits, trustProxy } = {}) {
  const relay = new Relay({ log, limits, trustProxy });
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url.startsWith('/health?')) {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
      return res.end(JSON.stringify({ ok: true, game: 'ashen-descent', protocol: 1, players: relay.players, rooms: relay.rooms.size }));
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Ashen Descent multiplayer relay. Connect with the Ashen Descent launcher.\n');
  });
  server.on('upgrade', (req, socket, head) => relay.handleUpgrade(req, socket, head));
  server.on('close', () => relay.close());
  server.relay = relay;
  return server;
}

module.exports = { Relay, createRelayServer, LIMITS, ROOM_RE, TOPIC_RE };
