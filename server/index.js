#!/usr/bin/env node
'use strict';
/**
 * The Ashen Descent multiplayer relay as a standalone server, for hosting the shared "Online server".
 * It is the same code the launcher runs for "Host on this PC" (launcher/src/core/relay.js).
 *
 *   node server/index.js                 listens on $PORT (default 47130)
 *
 * Behind a hosting proxy (Render, Fly, Railway...) set TRUST_PROXY=1 so per-address limits use the player's real
 * address. Health check: GET /health. See docs/MULTIPLAYER.md.
 */
const { createRelayServer } = require('../launcher/src/core/relay');

const port = Number(process.env.PORT) || 47130;
const server = createRelayServer({ trustProxy: process.env.TRUST_PROXY === '1', log: (m) => console.log(m) });
server.listen(port, '0.0.0.0', () => console.log(`Ashen Descent relay listening on :${port}`));
setInterval(() => {
  const r = server.relay;
  console.log(`players=${r.players} rooms=${r.rooms.size} messages=${r.stats.messages} dropped=${r.stats.dropped}`);
}, 10 * 60e3).unref();
const stop = () => { console.log('shutting down'); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
