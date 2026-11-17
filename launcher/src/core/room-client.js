'use strict';
/**
 * The game's side of the relay connection. It runs in the desktop game's main process (the game page itself may
 * not open plain ws:// connections), keeps the connection alive, reconnects with the same player id after a drop,
 * re-joins rooms and re-sends presence, and turns relay messages into the shapes the room API promises:
 *
 *   peers(room)   -> [{ peer, presence, updatedAt, by: null, isMe, sameTab, kind: 'viewer', guest: false }]
 *   'peers' event -> (room, { peers, joined, left, updated })
 *   'msg' event   -> (room, { topic, data, peer, by: null, isMe, sameTab, kind: 'viewer', guest: false })
 *   'conn' event  -> (connected: boolean)
 */
const { EventEmitter } = require('events');
const ws = require('./ws');

const PRESENCE_MS = 50; // coalesce presence: at most 20 sends a second per room

class RoomClient extends EventEmitter {
  constructor({ url, connect = ws.connect, log = () => {}, backoff = [500, 1000, 2000, 4000, 8000, 15000] } = {}) {
    super();
    this.url = url; this.connectFn = connect; this.log = log; this.backoff = backoff;
    this.conn = null; this.connected = false; this.peerId = null; this.token = null;
    this.rooms = new Map(); // name -> { peers: Map, mine: {}, joined, waiters: [], pending: null, timer: null }
    this.reqs = new Map(); this.nextId = 1; this.stopped = true; this.attempt = 0;
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this._dial();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    if (this.conn) this.conn.close(1000);
  }

  async _dial() {
    if (this.stopped) return;
    try {
      const c = await this.connectFn(this.url, { timeoutMs: 10000 });
      if (this.stopped) { c.close(1000); return; }
      this.conn = c;
      c.on('message', (m) => this._onMessage(m));
      c.on('close', () => this._onClose());
      c.on('error', () => {});
      c.send(JSON.stringify({ t: 'hello', v: 1, resume: this.peerId ? { peer: this.peerId, token: this.token } : undefined }));
      this.hb = setInterval(() => { if (this.conn) this.conn.send('{"t":"ping"}'); }, 20000);
      this.hb.unref?.();
    } catch (e) {
      this.log(`relay connect failed: ${e.message}`);
      this._schedule();
    }
  }

  _schedule() {
    if (this.stopped) return;
    const wait = this.backoff[Math.min(this.attempt, this.backoff.length - 1)];
    this.attempt++;
    clearTimeout(this.retry);
    this.retry = setTimeout(() => this._dial(), wait);
    this.retry.unref?.();
  }

  _onClose() {
    clearInterval(this.hb);
    this.conn = null;
    const was = this.connected;
    this.connected = false;
    for (const r of this.reqs.values()) r.reject(new Error('disconnected'));
    this.reqs.clear();
    for (const room of this.rooms.values()) room.joined = false;
    if (was) this.emit('conn', false);
    this._schedule();
  }

  _send(obj) { if (this.conn && this.connected) return this.conn.send(JSON.stringify(obj)); return false; }

  _request(obj, ms = 10000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.reqs.delete(id); reject(new Error('timed out')); }, ms);
      this.reqs.set(id, { resolve: (v) => { clearTimeout(t); resolve(v); }, reject: (e) => { clearTimeout(t); reject(e); } });
      if (!this._send({ ...obj, id })) { clearTimeout(t); this.reqs.delete(id); reject(new Error('not connected')); }
    });
  }

  _peerOut(p) {
    const me = p.peer === this.peerId;
    return { peer: p.peer, presence: p.presence || {}, updatedAt: p.updatedAt || Date.now(), by: null, isMe: me, sameTab: me, kind: 'viewer', guest: false };
  }

  _room(name) {
    let r = this.rooms.get(name);
    if (!r) { r = { peers: new Map(), mine: {}, joined: false, waiters: [], pending: null, timer: null }; this.rooms.set(name, r); }
    return r;
  }

  peers(name) {
    const r = this.rooms.get(name);
    return r ? [...r.peers.values()] : [];
  }

  _changed(name, change) {
    const peers = this.peers(name);
    this.emit('peers', name, { peers, joined: change.joined || [], left: change.left || [], updated: change.updated || [] });
  }

  async _onMessage(raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'welcome') {
      const resumed = m.peer === this.peerId;
      this.peerId = m.peer; this.token = m.token; this.connected = true; this.attempt = 0;
      if (!resumed) this.log(`relay: connected as ${m.peer}`);
      this.emit('conn', true);
      // Re-join every room we were in and restore our presence there.
      for (const name of this.rooms.keys()) this._rejoin(name).catch(() => {});
      return;
    }
    if (m.id !== undefined && this.reqs.has(m.id)) {
      const q = this.reqs.get(m.id); this.reqs.delete(m.id);
      if (m.t === 'err') q.reject(Object.assign(new Error(m.message || m.code), { code: m.code })); else q.resolve(m);
      if (m.t !== 'joined') return;
    }
    if (m.t === 'joined') return this._applyJoined(m.room, m.peers);
    if (m.t === 'peer') {
      const r = this.rooms.get(m.room);
      if (!r || !r.joined) return;
      if (m.ev === 'left') {
        const old = r.peers.get(m.peer);
        if (old) { r.peers.delete(m.peer); this._changed(m.room, { left: [old] }); }
        return;
      }
      const had = r.peers.has(m.peer);
      const p = this._peerOut(m);
      r.peers.set(m.peer, p);
      this._changed(m.room, had ? { updated: [p] } : { joined: [p] });
      return;
    }
    if (m.t === 'msg') {
      const me = m.peer === this.peerId;
      this.emit('msg', m.room, { topic: m.topic, data: m.data, peer: m.peer, by: null, isMe: me, sameTab: me, kind: 'viewer', guest: false });
    }
  }

  _applyJoined(name, list) {
    const r = this._room(name);
    const before = r.peers;
    r.peers = new Map();
    for (const p of list || []) r.peers.set(p.peer, this._peerOut(p.peer === this.peerId ? { ...p, presence: r.mine } : p));
    r.joined = true;
    const joined = [...r.peers.values()].filter((p) => !before.has(p.peer));
    const left = [...before.values()].filter((p) => !r.peers.has(p.peer));
    const updated = [...r.peers.values()].filter((p) => before.has(p.peer));
    this._changed(name, { joined, left, updated });
    // Our presence in this room (set before joining, or before a reconnect) goes out now.
    if (Object.keys(r.mine).length) this._send({ t: 'presence', room: name, patch: r.mine });
    for (const w of r.waiters.splice(0)) w.resolve();
  }

  _rejoin(name) { return this._request({ t: 'join', room: name }); }

  /** Join a room; resolves once joined (waits for a connection for up to `ms`). */
  join(name, ms = 12000) {
    const r = this._room(name);
    if (r.joined) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { r.waiters = r.waiters.filter((w) => w.resolve !== ok); reject(new Error('Could not reach the multiplayer server.')); }, ms);
      const ok = () => { clearTimeout(t); resolve(); };
      r.waiters.push({ resolve: ok });
      if (this.connected) this._request({ t: 'join', room: name }).catch((e) => { clearTimeout(t); r.waiters = r.waiters.filter((w) => w.resolve !== ok); if (e.code === 'full' || e.code === 'invalid_argument') reject(e); });
    });
  }

  async leave(name) {
    const r = this.rooms.get(name);
    if (!r) return;
    this.rooms.delete(name);
    clearTimeout(r.timer);
    if (this.connected) await this._request({ t: 'leave', room: name }).catch(() => {});
  }

  /** Merge into our presence in a room; applied locally at once, sent coalesced. */
  presence(name, patch) {
    const r = this._room(name);
    for (const [k, v] of Object.entries(patch || {})) { if (v === null) delete r.mine[k]; else r.mine[k] = v; }
    if (r.joined && this.peerId) {
      const me = this._peerOut({ peer: this.peerId, presence: { ...r.mine }, updatedAt: Date.now() });
      r.peers.set(this.peerId, me);
      this._changed(name, { updated: [me] });
    }
    r.pending = { ...(r.pending || {}), ...patch };
    if (!r.timer) {
      r.timer = setTimeout(() => {
        r.timer = null;
        const p = r.pending; r.pending = null;
        if (p && r.joined) this._send({ t: 'presence', room: name, patch: p });
      }, PRESENCE_MS);
    }
  }

  /** Send an event to a room (everyone there, us included, hears it). False when not connected: it is dropped. */
  emitTo(name, topic, data) {
    const r = this.rooms.get(name);
    if (!r || !r.joined) return false;
    return this._send({ t: 'emit', room: name, topic, data });
  }
}

module.exports = { RoomClient };
