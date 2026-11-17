'use strict';
// Runs a real install and kills the process at the named step, to test recovery on the next start.
const { Installer } = require('../../src/core/installer');
const [root, archive, buildJson, version, crashAt] = process.argv.slice(2);
const inst = new Installer(root, { hooks: { phase: (name) => { if (name === crashAt) process.exit(70); } } });
inst.install({ version, archive, build: JSON.parse(buildJson) })
  .then(() => process.exit(0))
  .catch((e) => { console.error(e.message); process.exit(1); });
