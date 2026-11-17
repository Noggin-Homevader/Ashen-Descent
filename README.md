# Ashen Descent

Game world where you delve into a mysterious depth of dungeons fighting creatures solo or with friends, progressing
through towns, and fighting Floor Bosses.

## Playing

**Windows:** download [AshenDescent-Setup.exe](https://github.com/Noggin-Homevader/Ashen-Descent/releases/latest/download/AshenDescent-Setup.exe)
and double-click it. It installs, opens the launcher, and the launcher downloads the game and keeps it up to date.
The installer is not code-signed yet: if Windows shows *Windows protected your PC*, choose **More info**, then
**Run anyway**. macOS and Linux builds are on the [latest release](https://github.com/Noggin-Homevader/Ashen-Descent/releases/latest).

## Repository layout

| Path | What it is |
|---|---|
| `game/app/` | The game build that gets released (currently the single-file HTML5/WebGL build, `index.html`). |
| `game/game.json` | Game version and the builds to package. |
| `game/CHANGELOG.md` | Release notes, one section per version. |
| `launcher/` | The launcher (Electron). See [docs/LAUNCHER.md](docs/LAUNCHER.md). |
| `tools/` | `package-game.js` (packages a release and writes its manifest), `verify-release.js`, `fetch-fonts.js`. |
| `.github/workflows/` | CI tests, the game release and launcher build workflows (both publish when the version changes on `main`). |

## For maintainers

- **Publish a game update:** bump `game/game.json`, add a changelog section and merge to `main`; the release is
  published automatically. Full steps and the manifest format are in
  [docs/RELEASES.md](docs/RELEASES.md).
- **Build the launcher:** `npm install && npm run dist`, or run the *Launcher build* workflow. See
  [docs/LAUNCHER.md](docs/LAUNCHER.md).
- **Test:** `npm test` (no install needed).
