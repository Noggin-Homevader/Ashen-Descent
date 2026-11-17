# Party play (multiplayer)

The game's party code, the same in the browser and the desktop app, talks to a real-time "room" service. As a
Claude artifact that service is built in. In the desktop app it is provided by the **Ashen Descent relay**, a
small server that recreates the same service:

- a shared **lobby** for everyone connected to the same relay (invites travel here);
- **party rooms** (`adp-<code>`) that a party's members join;
- each player's **presence** (position, health, class, gear), shared with the room;
- **events** (`snap`, `dmg`, `sys`, `kick`…), passed to everyone in the room.

The relay runs no game logic and stores nothing. The party leader's game stays in charge of monsters and loot, as
in the browser. It enforces the same limits as the artifact service: presence and event data at most 4 KB each,
about 40 messages a second per player (bursts of 80), up to 64 players per room, and 16 connections per address.

## The three ways to play together

Players choose in the launcher under **Party play → Settings**. Everyone in a party must use the same relay.

| Choice | Who it suits | What it needs |
|---|---|---|
| **Online server** | Everyone, anywhere | The relay deployed once (below). Its address comes from `multiplayer.json` in this repository. |
| **Host on this PC** | Friends on the same network, or with a virtual LAN | Nothing on the same network. Over the internet: forward TCP port **47130** on the host's router, or put everyone on a virtual LAN (Tailscale, ZeroTier, Radmin VPN). Windows asks once to allow the launcher through the firewall. |
| **Join a friend** | Connecting to someone who chose Host | The host's address, shown in their launcher (for example `192.168.1.20`). |

While hosting, the launcher keeps running in the system tray, even when its window is closed. **Quit** in the tray
icon's menu stops hosting.

## Setting up the online server (one time)

The relay is a plain Node.js server with no dependencies (`server/index.js`). The repository includes a Render
blueprint (`render.yaml`) for its free plan:

1. Open https://render.com/deploy?repo=https://github.com/Noggin-Homevader/Ashen-Descent and sign in with GitHub.
2. Apply the blueprint. Render builds and starts `ashen-descent-relay` and gives it an address like
   `https://ashen-descent-relay.onrender.com`.
3. Check `https://<your-address>/health`. It should answer `{"ok":true,"game":"ashen-descent",...}`.
4. Put the address, with `wss://` instead of `https://`, in `multiplayer.json` and merge it to `main`:
   ```json
   { "schema": 1, "servers": [ { "name": "Ashen Descent", "url": "wss://ashen-descent-relay.onrender.com" } ] }
   ```
   Launchers read this file each time they start, so no launcher update is needed. Only `wss://` addresses are
   accepted for online servers.

Render's free plan puts a service to sleep after 15 minutes without traffic. Waking it takes up to a minute. The
launcher wakes it in the background when it starts, so it is usually ready by the time the game opens. A paid plan
or another host avoids the sleep. Any host that runs Node.js 20+ and allows WebSockets works (Fly.io, Railway, a
VPS): run `node server/index.js` with `PORT` set and `TRUST_PROXY=1` when behind the host's proxy.

## How the desktop game connects

1. The launcher resolves the relay address from your choice and starts the game with `--ashen-mp <address>`.
2. The game window's preload (`launcher/src/main/game-preload.js`) provides `window.claude.use('room')` with the
   same API the artifact runtime has. The page itself never opens a network connection: browsers forbid
   unencrypted `ws://` connections from the game's secure page.
3. The game process's main side (`room-bridge.js` → `room-client.js`) holds the connection. It sends presence at
   most 20 times a second per room, reconnects with backoff, and keeps the player's id across reconnects (so a
   party survives a dropped connection), then re-joins rooms and restores presence.

With party play set to **Off**, or no server available, `use('room')` returns nothing and the game is solo, as
before.

## Tests

- `launcher/test/multiplayer.test.js`: WebSocket framing, relay rooms, presence, events and limits, reconnecting
  after a dropped connection and after a relay restart, two desktop game windows talking through the real preload
  bridge, and the launcher's hosting and server-list helpers.
- `launcher/test/ui/party-check.js` (needs Playwright): two copies of the real game connected through the relay.
  The leader makes a party, the friend joins with the code, the leader opens the portal, and both must arrive on
  the same floor with the same monsters.

## Online by default (launcher 1.4.0)

The launcher always plays online unless someone picks home-network play in its World settings; there is no "off".
If the server address could not be looked up when the launcher started, it looks again when Play is pressed, and
it hands the game the address without waiting for a sleeping server to wake (the game reconnects on its own).
