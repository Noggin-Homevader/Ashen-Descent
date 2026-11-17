# Ashen Descent launcher

The launcher is a small Electron app that shows the game's title screen, keeps the game up to date from this
repository's GitHub Releases, and starts it.

- `launcher/src/core/`: the update engine. Plain Node.js with no third-party packages: GitHub client, release
  selection, resumable verified downloads, a strict ZIP extractor, the transactional installer, the install
  lock, the game process runner and the state machine. All of it is covered by `npm test`.
- `launcher/src/main/`: Electron's main process. `launcher-app.js` runs the window; `game-host.js` is the game
  runtime for web builds.
- `launcher/src/renderer/`: the launcher page. `title-art.js` and `title-art.css` are the game's own title-screen
  code (logo, WebGL ember portal, rune-scribed ring, embers), copied unchanged.
- `launcher/launcher.config.json`: which repository to read, and defaults.
- `tools/`: game packaging, release verification and font download.

## Running and building

You need Node.js 20 or newer.

```sh
npm install          # Electron and electron-builder (development only)
npm test             # all launcher tests; needs no npm install
npm start            # run the launcher from source
npm run dist         # build an installer for this OS into dist/launcher/
```

`npm run test:ui` opens the real launcher page in Chromium against a fake GitHub server. It takes a screenshot
of every state and clicks Play. It needs the `playwright` package (`npm i -D playwright && npx playwright install chromium`).

Useful environment variables, mainly for development:

| Variable | Effect |
|---|---|
| `ASHEN_DATA_DIR` | Use this folder instead of the default data folder (for portable installs or testing). |
| `ASHEN_LAUNCHER_CONFIG` | Read this config file instead of `launcher/launcher.config.json`. |
| `ASHEN_LOG_STDOUT=1` | Also print the log to the terminal. |

Installers are built for Windows (a one-click NSIS installer: double-click, it installs per user without admin
rights, adds desktop and Start menu shortcuts and opens the launcher), macOS (DMG, x64 and arm64) and Linux
(AppImage) by the **Launcher build** workflow. That workflow runs on pull requests (build only) and on `main`.
When `main` has a `package.json` version with no `launcher-vX.Y.Z` release yet, it publishes that release as the
repository's latest. The Windows installer always has the same name, so this link always gets the newest launcher:

https://github.com/Noggin-Homevader/Ashen-Descent/releases/latest/download/AshenDescent-Setup.exe

## Configuration

`launcher/launcher.config.json` ships inside the launcher:

```json
{
  "github": { "owner": "Noggin-Homevader", "repo": "Ashen-Descent" },
  "apiBaseUrl": "https://api.github.com",
  "tagPrefix": "v",
  "manifestAssetName": "ashen-manifest.json",
  "allowPrerelease": false
}
```

Players can switch **Include test builds** on in the launcher. That setting is saved in
`<data>/launcher/settings.json` and turns on prereleases for that player only.

**No secrets.** The launcher makes unauthenticated requests for public releases only. It never contains or sends
a GitHub token. Unauthenticated API calls are limited to 60 an hour per IP address; the launcher makes one per
check, caches the reply with its ETag (GitHub does not count a `304 Not Modified` reply), and falls back to the
cached list if the limit is reached. Package downloads go through `github.com` release URLs, which this limit does
not cover.

**If the repository is made private**, the launcher can no longer see releases, and a token must never be built
into it. Pick one of these before going private:
1. Keep a separate **public** repository just for releases (for example `Ashen-Descent-Releases`), point
   `github.owner`/`github.repo` at it, and have the release workflow publish there with a fine-grained token stored
   as an Actions secret. Recommended.
2. Host the release files on a server or CDN that serves the same JSON shape, and set `apiBaseUrl`.
3. Make each player sign in with their own GitHub account (OAuth device flow) and give them read access. This is
   not implemented and only suits a closed test group.

## Where things are stored

Everything lives in one folder: `%APPDATA%\Ashen Descent` on Windows, `~/Library/Application Support/Ashen Descent`
on macOS, `~/.config/Ashen Descent` on Linux.

```
Ashen Descent/
  game/                       launcher-managed game files (contains .ashen-managed)
    versions/<version>/       the installed game + .ashen-receipt.json (every file's size and SHA-256)
    staging/  downloads/      temporary; emptied after each install
    current.json              which version is live
    install-journal.json      only while an install is in progress
    install.lock              only while an install is in progress
    game-process.json         only while the game is running
  userdata/                   player data; never written or deleted by the installer
    profile/                  the game's browser storage: saves, settings, account
    screenshots/  mods/
  launcher/                   launcher settings, release cache, logs/launcher.log
```

The launcher program itself is installed separately (Program Files, Applications, or the AppImage).
**Saves** in the launcher opens `userdata/`.

## How an update is installed

1. **Check.** Read the release list and choose a release, as described in [RELEASES.md](RELEASES.md).
2. **Download.** Write to `game/downloads/<file>.part`, with progress, size and speed. A dropped connection
   resumes with an HTTP Range request, automatically up to twice and again on the next Retry or launch. Stalled
   downloads time out after 30 seconds.
3. **Validate.** Check the exact size and SHA-256 from the manifest. A file that does not match is deleted.
4. **Unpack** into a fresh folder under `game/staging/`. Every entry is checked before anything is written: no
   absolute paths, `..`, drive letters, links or duplicates. Each file's CRC-32 and size are checked as it is
   written.
5. **Verify.** The executable and the `requiredFiles` must exist. Files listed in `preserve` are copied over from
   the current version. A receipt with every file's SHA-256 is written.
6. **Switch.** Move the new folder into `game/versions/`, then replace `current.json` with one atomic rename.
   Until this moment the previous version is untouched and live.
7. **Clean up.** Delete the other version folders (this removes the old version's files, including any the new
   version no longer has), staging leftovers and the downloaded package.
8. **Final check.** Hash every installed file against the receipt.

**Interrupted installs.** `install-journal.json` records how far an install got. On the next start the launcher
finishes it (if the new version was already switched in and is complete) or undoes it (removing partial files
and restoring the previous version). This is tested by killing a real process at each step.

**Ownership rules.** The installer only deletes entries inside `game/versions`, `game/staging` and
`game/downloads`. It never deletes the data folder, `userdata/`, or any folder it does not recognise as one of its
own. It refuses to take over an existing, non-empty `game/` folder that it did not create.

**One updater at a time.** The launcher allows a single window per data folder, and `install.lock` (holding the
owner's process id) stops any second launcher from updating the same installation. A lock left by a crashed
launcher is detected and replaced.

**The game must be closed.** Files are never replaced while the game runs. If an update is found while the game is
open, the launcher shows **Game running** and installs the update once the game closes.

## Playing

**Play** is enabled only when the installed copy passes its file check. The launcher starts the game in its
install folder, with the manifest's arguments, and records its process id. Play stays disabled while the game
runs. A second launch is also refused by the game window itself, which brings the running one forward instead.
When the game exits, the launcher returns to **Ready** and checks for updates again.

For web builds the launcher starts a second copy of itself in game mode. That copy opens the game in its own
window from a private `ashen-game://app/` address that maps onto the installed version folder. The address never
changes between versions, so browser saves carry over. They are stored in `userdata/profile`. Only fullscreen,
pointer lock and clipboard writing are allowed. Links open in the player's browser. Press F11 for fullscreen.

If the update check fails but a working copy is installed, the launcher says why and offers **Play offline**.
With no working copy it shows **Retry** instead of Play.

## Tests

`npm test` runs these with Node's test runner, using a local stand-in for the GitHub API and release downloads:

| Scenario | Test |
|---|---|
| First installation, then Play launches the game (correct executable, arguments and working folder) and the launcher returns to Ready | `updater.test.js`, `main-process.test.js` |
| Update from an older version, with the old version's obsolete files removed | `updater.test.js`, `installer.test.js` |
| Already on the latest version: no download, and the release list is served from cache with an ETag | `updater.test.js` |
| Network unavailable, with and without an installed copy (offline play / Retry) | `updater.test.js` |
| Corrupted download (checksum) and incomplete download (resumed with Range) | `updater.test.js`, `zip-download.test.js` |
| Interrupted installation: a real process killed at each of six steps, then recovered | `installer.test.js` |
| Game running: update postponed until the game exits; no duplicate launches | `updater.test.js` |
| Saves and settings preserved (profile folder and manifest `preserve` paths) | `installer.test.js`, `updater.test.js` |
| Rate limits, invalid manifests, missing assets, no build for this OS, launcher too old, prereleases | `updater.test.js`, `unit.test.js` |
| Hostile archives (path traversal, links, duplicates, damaged data) | `zip-download.test.js` |
| The real game packaged by `tools/package-game.js` and installed byte-for-byte | `packaging.test.js` |
| Launcher window security settings, IPC sender check, game-host file guard and permissions | `main-process.test.js` (against a stand-in for Electron) |

### Manual checks (need a real Electron build)

The Electron APIs themselves cannot be exercised by the automated tests. Check these once per launcher release on
each OS:

1. Start the launcher with no game installed: it shows the title screen, downloads, installs and shows **Play**.
2. Press **Play**: the game opens maximised and the launcher shows **Game running**. Close the game: the launcher
   returns to **Ready**.
3. Make a save, publish a new version, reopen the launcher: it updates, and the save is still there.
4. Turn off the network and reopen: **Play offline** works.
5. Start a second launcher: the first window comes forward instead.
6. Close the launcher during a download, then reopen it: the download continues where it stopped.

## Limitations

- **No launcher self-update.** The launcher updates the game, not itself. New launcher versions are published as
  `launcher-v*` releases. A game release can require one with `minLauncherVersion`, and older launchers then say
  so. Automatic launcher updates (for example `electron-updater`) would be a separate addition.
- **Unsigned installers.** Windows SmartScreen and macOS Gatekeeper warn about unsigned apps. Add code-signing
  certificates to the Launcher build workflow before a wide release.
- **Party play in the desktop game.** The game's party mode uses the real-time "room" service that is provided
  when the game runs as a Claude artifact. That service does not exist in the desktop runtime, so solo play works
  there but party play needs a multiplayer backend.
- **Moving existing saves.** Saves made in a browser or as an artifact stay in that browser. To move a hero into
  the desktop game, use **Copy backup code** in the old game, then **Import backup code** in the desktop game's Vault.
- **Fonts.** The Almendra title font is downloaded during `npm run dist`. A build made without network access
  uses a fallback serif. The game itself loads its fonts from Google Fonts when online.
