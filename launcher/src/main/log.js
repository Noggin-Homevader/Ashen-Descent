'use strict';
/** A small append-only log at <data>/launcher/logs/launcher.log, rotated at 1 MB. */
const fs = require('fs');
const path = require('path');

function createLog(dir) {
  const file = path.join(dir, 'launcher.log');
  try { fs.mkdirSync(dir, { recursive: true }); if (fs.statSync(file).size > 1024 * 1024) fs.renameSync(file, `${file}.1`); } catch {}
  return (msg) => {
    const line = `${new Date().toISOString()} ${msg}\n`;
    try { fs.appendFileSync(file, line); } catch {}
    if (process.env.ASHEN_LOG_STDOUT) process.stdout.write(line);
  };
}

module.exports = { createLog };
