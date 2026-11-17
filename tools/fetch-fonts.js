#!/usr/bin/env node
'use strict';
/**
 * Download the Almendra typeface (SIL Open Font License) that the game's title uses, so the launcher shows it
 * without a network connection. Run automatically by `npm run dist`. Without the files the launcher falls back to
 * Palatino/Georgia.
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/almendra/';
const FILES = ['Almendra-Regular.ttf', 'Almendra-Bold.ttf', 'OFL.txt'];
const OUT = path.join(__dirname, '..', 'launcher', 'src', 'renderer', 'fonts');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of FILES) {
    const dest = path.join(OUT, f);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { console.log(`have ${f}`); continue; }
    try {
      const res = await fetch(BASE + f, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (f.endsWith('.ttf') && buf.readUInt32BE(0) !== 0x00010000) throw new Error('not a TrueType font');
      fs.writeFileSync(dest, buf);
      console.log(`fetched ${f} (${buf.length} bytes)`);
    } catch (e) {
      console.warn(`warning: could not fetch ${f}: ${e.message}. The launcher will use a fallback serif font.`);
      if (process.argv.includes('--strict')) process.exit(1);
    }
  }
})();
