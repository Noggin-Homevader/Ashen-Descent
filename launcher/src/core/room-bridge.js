'use strict';
/**
 * The game process's side of the room API: request handlers for the game window (room:use, room:join, room:leave,
 * room:presence, room:emit) and the events it pushes to the window (room:conn, room:peers, room:msg), all backed by
 * one RoomClient. game-host.js wires these to Electron IPC; tests wire them to a browser page.
 */
const { RoomClient } = require('./room-client');

function createRoomBridge({ url, send, makeClient = (o) => new RoomClient(o) }) {
  let rc = null;
  const client = () => {
    if (!rc) {
      rc = makeClient({ url });
      rc.on('conn', (c) => send('room:conn', c));
      rc.on('peers', (room, ch) => send('room:peers', room, ch));
      rc.on('msg', (room, m) => send('room:msg', room, m));
      rc.start();
      rc.join('lobby').catch(() => {}); // the lobby is always joined; reconnects re-join it by themselves
    }
    return rc;
  };
  const handlers = {
    'room:use': async () => { const c = client(); return { ok: true, connected: c.connected, peers: c.peers('lobby') }; },
    'room:join': async (room) => {
      try { await client().join(String(room)); return { ok: true, peers: rc.peers(String(room)) }; } catch (e) { return { error: e.message, code: e.code || 'unavailable' }; }
    },
    'room:leave': async (room) => { if (rc && room !== 'lobby') await rc.leave(String(room)); return true; },
    'room:presence': async (room, patch) => {
      const c = client();
      const merged = { ...((c.rooms.get(room) || {}).mine || {}) };
      for (const [k, v] of Object.entries(patch || {})) { if (v === null) delete merged[k]; else merged[k] = v; }
      if (Buffer.byteLength(JSON.stringify(merged), 'utf8') > 4096) return { error: 'presence is over 4 KiB' };
      c.presence(String(room), patch);
      return { ok: true };
    },
    'room:emit': async (room, topic, data) => { client().emitTo(String(room), String(topic), data); return true; },
  };
  return { handlers, stop: () => { if (rc) rc.stop(); }, get client() { return rc; } };
}

module.exports = { createRoomBridge };
