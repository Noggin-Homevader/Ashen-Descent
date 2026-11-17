'use strict';
// Plays the part of the launcher executable started in game mode, to test the arguments the launcher passes.
const fs = require('fs');
const a = process.argv.slice(2);
const gi = a.indexOf('--ashen-game'), pi = a.indexOf('--ashen-profile');
fs.writeFileSync(process.env.ASHEN_TEST_MARKER, JSON.stringify({ argv: a, game: a[gi + 1], profile: a[pi + 1], cwd: process.cwd(), ok: gi >= 0 && pi >= 0 && fs.existsSync(a[gi + 1]) }));
setTimeout(() => process.exit(0), 200);
