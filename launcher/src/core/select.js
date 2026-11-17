'use strict';
/** Choose the newest published release that has a valid manifest and a build for this computer. */
const semver = require('./semver');
const { validateManifest } = require('./manifest');
const { pickBuild } = require('./platform');
const { LauncherError } = require('./errors');

const MAX_CANDIDATES = 8;

function tagVersion(tag, prefix) {
  if (typeof tag !== 'string') return null;
  if (prefix && !tag.startsWith(prefix)) return null;
  const v = tag.slice(prefix ? prefix.length : 0);
  return semver.valid(v) ? semver.parse(v).raw : null;
}

/**
 * @returns {Promise<{version,tag,build,asset:{url,size,name},notes,publishedAt,htmlUrl,prerelease,stale,skipped}>}
 */
async function findLatest({ github, config, platform, launcherVersion, allowPrerelease, log = () => {} }) {
  const { releases, stale } = await github.listReleases();
  const skipped = [];
  const candidates = [];
  for (const r of releases) {
    if (!r || typeof r !== 'object') continue;
    if (r.draft) continue;
    if (r.prerelease && !allowPrerelease) continue;
    const v = tagVersion(r.tag_name, config.tagPrefix);
    if (!v) continue; // not a game release tag (e.g. launcher-v1.0.0)
    if (semver.isPrerelease(v) && !allowPrerelease) continue;
    candidates.push({ r, v });
  }
  candidates.sort((a, b) => semver.compare(b.v, a.v));
  if (!candidates.length) {
    throw new LauncherError('no-release', 'There is no published game release to install yet.', {
      detail: allowPrerelease ? '' : 'Only stable releases are offered. Test builds appear when "Include test builds" is on.',
    });
  }
  for (const { r, v } of candidates.slice(0, MAX_CANDIDATES)) {
    const tag = r.tag_name;
    const skip = (reason) => { skipped.push({ tag, reason }); log(`skip ${tag}: ${reason}`); };
    const assets = Array.isArray(r.assets) ? r.assets : [];
    const mAsset = assets.find((a) => a && a.name === config.manifestAssetName);
    if (!mAsset || !mAsset.browser_download_url) { skip('no release manifest'); continue; }
    let manifest;
    try {
      manifest = validateManifest(await github.fetchJsonAsset(mAsset.browser_download_url), { tagVersion: v, expectName: config.gameId });
    } catch (e) {
      if (e instanceof LauncherError && (e.kind === 'network' || e.kind === 'rate-limit')) throw e;
      skip(`invalid manifest: ${e.message}`); continue;
    }
    if (manifest.minLauncherVersion && semver.compare(launcherVersion, manifest.minLauncherVersion) < 0) {
      skip(`needs launcher ${manifest.minLauncherVersion}`); continue;
    }
    const build = pickBuild(manifest.builds, platform);
    if (!build) { skip(`no build for ${platform.os}/${platform.arch}`); continue; }
    const asset = assets.find((a) => a && a.name === build.file);
    if (!asset || !asset.browser_download_url) { skip(`asset ${build.file} is missing`); continue; }
    if (asset.state && asset.state !== 'uploaded') { skip(`asset ${build.file} is not fully uploaded`); continue; }
    if (Number.isFinite(asset.size) && asset.size !== build.size) { skip(`asset ${build.file} is ${asset.size} bytes, manifest says ${build.size}`); continue; }
    return {
      version: manifest.version, tag, build,
      asset: { url: asset.browser_download_url, size: build.size, name: build.file },
      notes: manifest.releaseNotes || (typeof r.body === 'string' ? r.body : ''),
      publishedAt: r.published_at || null, htmlUrl: r.html_url || null,
      prerelease: !!r.prerelease || semver.isPrerelease(manifest.version), stale, skipped,
    };
  }
  const needLauncher = skipped.filter((s) => /^needs launcher/.test(s.reason));
  if (needLauncher.length && needLauncher.length === skipped.length) {
    throw new LauncherError('launcher-too-old', `Version ${candidates[0].v} needs a newer launcher.`, {
      detail: 'Download the latest launcher from the game’s releases page.', retryable: false,
    });
  }
  if (skipped.length && skipped.every((s) => /^no build for/.test(s.reason))) {
    throw new LauncherError('no-compatible-build', `No release has a build for ${platform.os} (${platform.arch}).`, { retryable: false });
  }
  throw new LauncherError('no-compatible-build', 'No release could be used.', {
    detail: skipped.slice(0, 3).map((s) => `${s.tag}: ${s.reason}`).join('; '),
  });
}

module.exports = { findLatest, tagVersion };
