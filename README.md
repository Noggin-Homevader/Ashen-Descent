# Ashen Descent

Game world where you delve into a mysterious depth of dungeons fighting creatures solo or with friends, progressing
through towns, and fighting Floor Bosses.

## Playing

Install the **Ashen Descent launcher** from this repository's Releases page (the `launcher-v…` releases). It
downloads the game the first time, keeps it up to date from published game releases, and starts it with **Play**.

## Repository layout

| Path | What it is |
|---|---|
| `game/app/` | The game build that gets released (currently the single-file HTML5/WebGL build, `index.html`). |
| `game/game.json` | Game version and the builds to package. |
| `game/CHANGELOG.md` | Release notes, one section per version. |
| `launcher/` | The launcher (Electron). See [docs/LAUNCHER.md](docs/LAUNCHER.md). |
| `tools/` | `package-game.js` (packages a release and writes its manifest), `verify-release.js`, `fetch-fonts.js`. |
| `.github/workflows/` | CI tests, the game release workflow (creates draft releases) and the launcher build. |

## For maintainers

- **Publish a game update:** bump `game/game.json`, add a changelog section, push a `vX.Y.Z` tag, then publish
  the draft release that the workflow creates. Full steps and the manifest format are in
  [docs/RELEASES.md](docs/RELEASES.md).
- **Build the launcher:** `npm install && npm run dist`, or run the *Launcher build* workflow. See
  [docs/LAUNCHER.md](docs/LAUNCHER.md).
- **Test:** `npm test` (no install needed).
