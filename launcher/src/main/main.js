'use strict';
/**
 * Electron entry point.
 *
 * The same executable has two roles:
 *   - the launcher window (default), and
 *   - the game runtime for web builds, started by the launcher as a separate process with
 *     `--ashen-game <index.html> --ashen-profile <folder>`.
 */
const gameArg = process.argv.indexOf('--ashen-game');
if (gameArg !== -1) {
  require('./game-host').run(process.argv, gameArg);
} else {
  require('./launcher-app').run();
}
