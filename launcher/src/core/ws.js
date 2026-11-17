'use strict';
/**
 * A small WebSocket (RFC 6455) implementation on Node's own http/https/net modules, used by the multiplayer relay
 * (server side) and by the game process (client side). Text messages only, which is all the relay protocol uses.
 * It handles masking, fragmented messages, ping/pong and the closing handshake, and enforces a maximum message size.
 */
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const acceptKey = (key) => crypto.createHash('sha1').update(key + GUID).digest('base64');

class WsConn extends EventEmitter {
  /**
   * @param {import('net').Socket} socket
   * @param {{client?: boolean, maxPayload?: number, head?: Buffer}} o
   */
  constructor(socket, { client = false, maxPayload = 64 * 1024, head } = {}) {
    super();
    this.socket = socket; this.client = client; this.maxPayload = maxPayload;
    this.buf = Buffer.alloc(0); this.frags = null; this.open = true; this.closeSent = false;
    socket.setNoDelay(true);
    socket.on('data', (d) => this._data(d));
    socket.on('close', () => this._closed(1006));
    socket.on('error', (e) => { this._error(e); this._closed(1006); });
    if (head && head.length) setImmediate(() => this._data(head));
  }

  get readyState() { return this.open ? 1 : 3; }

  _frame(opcode, payload) {
    const len = payload.length;
    let hdr;
    if (len < 126) { hdr = Buffer.alloc(2); hdr[1] = len; }
    else if (len < 65536) { hdr = Buffer.alloc(4); hdr[1] = 126; hdr.writeUInt16BE(len, 2); }
    else { hdr = Buffer.alloc(10); hdr[1] = 127; hdr.writeBigUInt64BE(BigInt(len), 2); }
    hdr[0] = 0x80 | opcode;
    if (!this.client) return Buffer.concat([hdr, payload]);
    hdr[1] |= 0x80;
    const mask = crypto.randomBytes(4);
    const body = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) body[i] = payload[i] ^ mask[i & 3];
    return Buffer.concat([hdr, mask, body]);
  }

  /** Send a text message. Returns false if the connection is closed. */
  send(text) {
    if (!this.open || this.closeSent) return false;
    try { this.socket.write(this._frame(1, Buffer.from(String(text), 'utf8'))); return true; } catch { return false; }
  }

  ping() { if (this.open && !this.closeSent) try { this.socket.write(this._frame(9, Buffer.alloc(0))); } catch {} }

  close(code = 1000, reason = '') {
    if (!this.open) return;
    if (!this.closeSent) {
      this.closeSent = true;
      const r = Buffer.from(String(reason).slice(0, 100), 'utf8');
      const p = Buffer.alloc(2 + r.length); p.writeUInt16BE(code, 0); r.copy(p, 2);
      try { this.socket.write(this._frame(8, p)); } catch {}
    }
    setTimeout(() => { try { this.socket.destroy(); } catch {} }, 1500).unref?.();
    try { this.socket.end(); } catch {}
  }

  terminate() { try { this.socket.destroy(); } catch {} this._closed(1006); }

  _closed(code) {
    if (!this.open) return;
    this.open = false;
    this.emit('close', code);
  }

  // Errors are reported only to listeners; an unheard 'error' event must never crash the relay or the game.
  _error(e) { if (this.listenerCount('error')) this.emit('error', e); }

  _fail(code, why) { this._error(new Error(why)); this.close(code, why); this.terminate(); }

  _data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.open) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      if (b[0] & 0x70) return this._fail(1002, 'reserved bits set');
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; const big = b.readBigUInt64BE(2); if (big > BigInt(this.maxPayload)) return this._fail(1009, 'message too big'); len = Number(big); off = 10; }
      if (len > this.maxPayload) return this._fail(1009, 'message too big');
      if (!this.client && !masked) return this._fail(1002, 'client frames must be masked');
      if (this.client && masked) return this._fail(1002, 'server frames must not be masked');
      const mOff = off; if (masked) off += 4;
      if (b.length < off + len) return;
      let payload = b.subarray(off, off + len);
      if (masked) { const m = b.subarray(mOff, mOff + 4); const u = Buffer.allocUnsafe(len); for (let i = 0; i < len; i++) u[i] = payload[i] ^ m[i & 3]; payload = u; }
      else payload = Buffer.from(payload);
      this.buf = b.subarray(off + len);
      if (op >= 8) {
        if (!fin || len > 125) return this._fail(1002, 'bad control frame');
        if (op === 8) { const code = len >= 2 ? payload.readUInt16BE(0) : 1005; if (!this.closeSent) this.close(code === 1005 ? 1000 : code); this._closed(code); try { this.socket.end(); } catch {} return; }
        if (op === 9) { try { if (!this.closeSent) this.socket.write(this._frame(10, payload)); } catch {} continue; }
        if (op === 10) { this.emit('pong'); continue; }
        return this._fail(1002, 'unknown control frame');
      }
      if (op === 0) { if (!this.frags) return this._fail(1002, 'unexpected continuation'); this.frags.push(payload); }
      else if (op === 1 || op === 2) { if (this.frags) return this._fail(1002, 'expected continuation'); this.frags = [payload]; this.fragOp = op; }
      else return this._fail(1002, 'unknown opcode');
      const total = this.frags.reduce((a, x) => a + x.length, 0);
      if (total > this.maxPayload) return this._fail(1009, 'message too big');
      if (fin) {
        const msg = Buffer.concat(this.frags); this.frags = null;
        if (this.fragOp !== 1) return this._fail(1003, 'text messages only');
        this.emit('message', msg.toString('utf8'));
      }
    }
  }
}

/** Server side: finish an HTTP upgrade request. Returns the connection, or null (and answers 400) if invalid. */
function acceptUpgrade(req, socket, head, opts = {}) {
  const key = req.headers['sec-websocket-key'];
  const ok = req.method === 'GET' && /websocket/i.test(req.headers.upgrade || '') && /upgrade/i.test(req.headers.connection || '')
    && req.headers['sec-websocket-version'] === '13' && typeof key === 'string' && Buffer.from(key, 'base64').length === 16;
  if (!ok) { try { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); } catch {} return null; }
  socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptKey(key)}`, '', ''].join('\r\n'));
  return new WsConn(socket, { client: false, maxPayload: opts.maxPayload, head });
}

/** Client side: connect to ws:// or wss:// and resolve with the open connection. */
function connect(url, { timeoutMs = 10000, maxPayload = 256 * 1024, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch { return reject(new Error(`Invalid server address: ${url}`)); }
    if (u.protocol !== 'ws:' && u.protocol !== 'wss:') return reject(new Error('The server address must start with ws:// or wss://'));
    const key = crypto.randomBytes(16).toString('base64');
    const mod = u.protocol === 'wss:' ? https : http;
    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'wss:' ? 443 : 80), path: `${u.pathname || '/'}${u.search || ''}`,
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key, 'User-Agent': 'AshenDescent', ...headers },
      timeout: timeoutMs,
    });
    const t = setTimeout(() => { req.destroy(new Error('Timed out connecting to the multiplayer server.')); }, timeoutMs);
    req.on('upgrade', (res, socket, head) => {
      clearTimeout(t);
      if (res.headers['sec-websocket-accept'] !== acceptKey(key)) { socket.destroy(); return reject(new Error('The server did not accept the connection.')); }
      resolve(new WsConn(socket, { client: true, maxPayload, head }));
    });
    req.on('response', (res) => { clearTimeout(t); res.resume(); reject(new Error(`The server answered HTTP ${res.statusCode} instead of opening a connection.`)); });
    req.on('error', (e) => { clearTimeout(t); reject(e); });
    req.on('timeout', () => req.destroy(new Error('Timed out connecting to the multiplayer server.')));
    req.end();
  });
}

module.exports = { WsConn, acceptUpgrade, connect, acceptKey };
