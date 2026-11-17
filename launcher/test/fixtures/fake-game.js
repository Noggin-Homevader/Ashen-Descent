'use strict';
// Stands in for the game in tests: records how it was launched, stays open briefly, then exits.
const fs = require('fs');
const [entry, ...args] = process.argv.slice(2);
const out = process.env.ASHEN_TEST_MARKER;
if (out) {
  fs.writeFileSync(out, JSON.stringify({
    cwd: process.cwd(), entry, args, entryExists: fs.existsSync(entry),
    entryText: fs.existsSync(entry) ? fs.readFileSync(entry, 'utf8').slice(0, 200) : null,
    userData: process.env.ASHEN_USER_DATA || null, pid: process.pid,
  }));
}
setTimeout(() => process.exit(Number(process.env.ASHEN_TEST_EXIT || 0)), Number(process.env.ASHEN_TEST_GAME_MS || 300));
