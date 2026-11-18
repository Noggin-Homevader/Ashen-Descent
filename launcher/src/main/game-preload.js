'use strict';
/**
 * Preload for the desktop game window. It gives the game the same `window.claude.use('room')` API it has when it
 * runs as a Claude artifact, so party play works unchanged. The connection to the multiplayer relay lives in the
 * game process's main side (game-host.js); this file keeps a local copy of each room's players so `peers()` can
 * answer instantly, and forwards everything else over IPC.
 *
 * When no multiplayer server is configured, `use('room')` resolves to null and the game shows party play as
 * unavailable, as before.
 */
const { contextBridge, ipcRenderer } = require('electron');

const TOPIC = /^[a-z][a-z0-9_.-]{0,47}$/;
const enabled = process.argv.includes('--ashen-mp=1');
const freeze = (a) => Object.freeze(a.map((p) => Object.freeze({ ...p, presence: Object.freeze({ ...p.presence }) })));
const jsonBytes = (v) => new TextEncoder().encode(JSON.stringify(v === undefined ? null : v)).length;
const rejectArg = (msg) => Promise.reject(Object.assign(new Error(msg), { code: 'invalid_argument' }));

const rooms = new Map(); // name -> state
let connected = false;
const connListeners = new Set();

function state(name) {
  let s = rooms.get(name);
  if (!s) { s = { peers: Object.freeze([]), topics: new Map(), peerL: new Set(), alive: true }; rooms.set(name, s); }
  return s;
}

ipcRenderer.on('room:conn', (_e, on) => { connected = !!on; for (const f of [...connListeners]) try { f(connected); } catch (e) { console.error(e); } });
ipcRenderer.on('room:peers', (_e, name, change) => {
  const s = rooms.get(name); if (!s || !s.alive) return;
  s.peers = freeze(change.peers);
  const ch = { peers: s.peers, joined: change.joined, left: change.left, updated: change.updated };
  for (const f of [...s.peerL]) try { f(ch); } catch (e) { console.error(e); }
});
ipcRenderer.on('room:msg', (_e, name, msg) => {
  const s = rooms.get(name); if (!s || !s.alive) return;
  const set = s.topics.get(msg.topic); if (!set) return;
  for (const f of [...set]) try { f(Object.freeze({ ...msg })); } catch (e) { console.error(e); }
});

function roomApi(name, { lobby }) {
  const s = state(name);
  const api = {
    emit(topic, data) {
      if (!s.alive) return Promise.reject(Object.assign(new Error('left this room'), { code: 'closed' }));
      if (typeof topic !== 'string' || !TOPIC.test(topic)) return rejectArg('bad topic');
      if (jsonBytes(data) > 4096) return rejectArg('data is over 4 KiB');
      return ipcRenderer.invoke('room:emit', name, topic, data === undefined ? null : data).then(() => undefined);
    },
    on(topic, handler, onError) {
      if (typeof handler !== 'function') throw new TypeError('handler must be a function');
      if (typeof topic !== 'string' || !TOPIC.test(topic)) { if (onError) queueMicrotask(() => onError({ code: 'invalid_argument', message: 'bad topic' })); return () => {}; }
      let set = s.topics.get(topic); if (!set) { set = new Set(); s.topics.set(topic, set); }
      const f = (m) => handler(m); set.add(f);
      return () => set.delete(f);
    },
    presence(patch) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return rejectArg('patch must be an object');
      return ipcRenderer.invoke('room:presence', name, patch).then((r) => { if (r && r.error) throw Object.assign(new Error(r.error), { code: 'invalid_argument' }); });
    },
    peers() { return s.peers; },
    onPeers(handler, onError) {
      if (typeof handler !== 'function') throw new TypeError('handler must be a function');
      const f = (ch) => handler(ch); s.peerL.add(f);
      queueMicrotask(() => { if (s.peerL.has(f)) try { handler({ peers: s.peers, joined: s.peers, left: [], updated: [] }); } catch (e) { console.error(e); } });
      void onError;
      return () => s.peerL.delete(f);
    },
    connected() { return connected; },
    onConnection(handler) {
      if (typeof handler !== 'function') throw new TypeError('handler must be a function');
      const f = (c) => handler(c); connListeners.add(f);
      queueMicrotask(() => { if (connListeners.has(f)) handler(connected); });
      return () => connListeners.delete(f);
    },
  };
  if (lobby) {
    api.join = async (room) => {
      if (typeof room !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(room)) throw Object.assign(new Error('bad room name'), { code: 'invalid_argument' });
      const r = await ipcRenderer.invoke('room:join', room);
      if (r && r.error) throw Object.assign(new Error(r.error), { code: r.code || 'unavailable' });
      const st = state(room); st.alive = true; st.peers = freeze(r.peers || []);
      return roomApi(room, { lobby: false });
    };
  } else {
    api.leave = async () => {
      s.alive = false; s.topics.clear(); s.peerL.clear(); rooms.delete(name);
      await ipcRenderer.invoke('room:leave', name);
    };
  }
  return api;
}

let lobbyPromise = null;
contextBridge.exposeInMainWorld('claude', {
  use: (cap) => {
    if (cap !== 'room' || !enabled) return Promise.resolve(null);
    if (!lobbyPromise) {
      lobbyPromise = ipcRenderer.invoke('room:use').then((r) => {
        if (!r || !r.ok) return null;
        connected = !!r.connected;
        const s = state('lobby'); s.peers = freeze(r.peers || []);
        return roomApi('lobby', { lobby: true });
      });
    }
    return lobbyPromise;
  },
});

// Lets the game tell it is running in the desktop app.
contextBridge.exposeInMainWorld('ASHEN_DESKTOP', {
  multiplayer: enabled,
  // a performance report from the game, saved next to launcher.log
  savePerf: (text) => ipcRenderer.invoke('game:perf', String(text).slice(0, 2e6)),
});

// Tell the window it can appear: once the title screen (or the vault) is on the page and has been painted.
if (typeof document !== 'undefined') {
  const visible = (el) => el && !el.hidden && el.getClientRects().length > 0;
  const check = () => {
    if (visible(document.getElementById('splash')) || visible(document.querySelector('#st.vault'))) {
      requestAnimationFrame(() => requestAnimationFrame(() => ipcRenderer.send('game:ready')));
      return;
    }
    setTimeout(check, 50);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', check, { once: true }); else check();
}
