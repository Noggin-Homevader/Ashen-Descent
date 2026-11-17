'use strict';
/**
 * Multiplayer settings in the launcher.
 *
 * Three ways to play with friends:
 *   online  the shared Ashen Descent server. Its address comes from multiplayer.json in the repository (so it can be
 *           set up or moved without a new launcher), else from launcher.config.json.
 *   host    this PC runs the relay (inside the launcher, which keeps running in the tray while you play).
 *           Friends on the same network choose "Join" and type this PC's address; over the internet they need the
 *           port forwarded or a virtual LAN (Tailscale, ZeroTier, Radmin VPN...).
 *   join    connect to a friend who is hosting.
 *   off     no party play.
 */
const os = require('os');
const { createRelayServer } = require('./relay');

const DEFAULT_PORT = 47130;
const MODES = ['online', 'host', 'join']; // a saved 'off' from older launchers counts as 'online'

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.internal || a.family !== 'IPv4') continue;
      if (/^169\.254\./.test(a.address)) continue;
      out.push({ address: a.address, name });
    }
  }
  // Typical home networks first; virtual LANs (Tailscale 100.x, ZeroTier, Radmin 26.x) after.
  const rank = (ip) => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  return out.sort((x, y) => rank(x.address) - rank(y.address));
}

/** Turn what a player typed ("192.168.1.20", "pc.local:5000", "ws://...") into a relay address. */
function joinUrl(input, port = DEFAULT_PORT) {
  let s = String(input || '').trim();
  if (!s || /\s/.test(s)) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !/^wss?:\/\//i.test(s)) return null; // http://, ftp://...: not a relay
  if (!/^wss?:\/\//i.test(s)) s = `ws://${s}`;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (!u.hostname || !/^[\w.\-[\]:]+$/.test(u.hostname)) return null;
  if (!u.port && u.protocol === 'ws:') u.port = String(port);
  return u.toString().replace(/\/$/, '');
}

function validServerUrl(u) {
  if (typeof u !== 'string') return false;
  try { const x = new URL(u); return x.protocol === 'wss:' || (x.protocol === 'ws:' && /^(localhost|127\.0\.0\.1)$/.test(x.hostname)); } catch { return false; }
}

/** Ask a relay whether it is up (also wakes a sleeping free-tier host). */
async function health(fetchFn, wsUrl, timeoutMs = 8000) {
  try {
    const u = new URL(wsUrl);
    u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    u.pathname = '/health';
    const res = await fetchFn(u.toString(), { signal: AbortSignal.timeout(timeoutMs), headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const j = await res.json();
    return j && j.game === 'ashen-descent' ? { ok: true, players: j.players | 0 } : { ok: false, error: 'not an Ashen Descent server' };
  } catch (e) { return { ok: false, error: e.name === 'TimeoutError' ? 'no answer' : (e.cause && e.cause.code) || e.message }; }
}

/** The shared online server's address: multiplayer.json in the repository, then the shipped config. */
async function onlineServer(fetchFn, config) {
  const fromConfig = config.multiplayer && validServerUrl(config.multiplayer.serverUrl) ? config.multiplayer.serverUrl : null;
  const listUrl = `https://raw.githubusercontent.com/${config.github.owner}/${config.github.repo}/main/multiplayer.json`;
  try {
    const res = await fetchFn(listUrl, { signal: AbortSignal.timeout(8000), headers: { 'cache-control': 'no-cache' } });
    if (res.ok) {
      const j = await res.json();
      const s = j && Array.isArray(j.servers) ? j.servers.find((x) => x && validServerUrl(x.url)) : null;
      if (s) return { url: s.url, name: String(s.name || 'Ashen Descent server').slice(0, 40) };
    }
  } catch { /* offline: fall back */ }
  return fromConfig ? { url: fromConfig, name: 'Ashen Descent server' } : null;
}

/** Runs the relay on this PC while "Host" is chosen. */
class LocalHost {
  constructor({ port = DEFAULT_PORT, log = () => {} } = {}) { this.port = port; this.log = log; this.server = null; this.error = null; }
  get running() { return !!this.server; }
  get players() { return this.server ? this.server.relay.players : 0; }
  start() {
    if (this.server) return Promise.resolve();
    return new Promise((resolve) => {
      const srv = createRelayServer({ log: this.log });
      srv.once('error', (e) => {
        this.error = e.code === 'EADDRINUSE' ? `Port ${this.port} is already in use (is another copy hosting?).` : e.message;
        this.log(`host: ${this.error}`); this.server = null; resolve();
      });
      srv.listen(this.port, '0.0.0.0', () => { this.server = srv; this.error = null; this.port = srv.address().port; this.log(`host: relay listening on port ${this.port}`); resolve(); });
    });
  }
  stop() {
    if (!this.server) return Promise.resolve();
    const s = this.server; this.server = null;
    return new Promise((r) => { s.relay.close(); for (const c of s.relay.clients) c.ws.terminate(); s.close(() => r()); });
  }
}

module.exports = { MODES, DEFAULT_PORT, lanAddresses, joinUrl, validServerUrl, health, onlineServer, LocalHost };
