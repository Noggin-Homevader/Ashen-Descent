'use strict';
/**
 * The release manifest (ashen-manifest.json) attached to every game release. See docs/RELEASES.md.
 *
 * {
 *   "schema": 1,
 *   "name": "ashen-descent",
 *   "version": "2.0.0",
 *   "releaseNotes": "markdown, optional",
 *   "minLauncherVersion": "1.0.0",            optional
 *   "builds": [{
 *     "os": "windows|macos|linux|any",
 *     "arch": "x64|arm64|x86|arm|any",
 *     "runtime": "native|web",
 *     "file": "AshenDescent-2.0.0-any-any.zip",  release asset name
 *     "size": 12345,                             bytes
 *     "sha256": "64 hex chars",
 *     "executable": "index.html",                relative to the install folder
 *     "args": [],                                launch arguments
 *     "requiredFiles": ["index.html"],           must exist after extraction
 *     "preserve": ["saves/", "settings.ini"]     user files inside the install folder kept across updates
 *   }]
 * }
 */
const semver = require('./semver');
const { safeRelative } = require('./paths');
const { LauncherError } = require('./errors');
const { OS_NAMES, ARCH_NAMES } = require('./platform');

const SCHEMA = 1;
const RUNTIMES = ['native', 'web'];

function fail(msg) { return new LauncherError('manifest', msg, { retryable: false }); }

function validateBuild(b, i) {
  const at = `builds[${i}]`;
  if (!b || typeof b !== 'object') throw fail(`${at} is not an object.`);
  const os = b.os, arch = b.arch;
  if (!(os === 'any' || OS_NAMES.includes(os))) throw fail(`${at}.os "${os}" is not a known operating system.`);
  if (!(arch === 'any' || ARCH_NAMES.includes(arch))) throw fail(`${at}.arch "${arch}" is not a known architecture.`);
  const runtime = b.runtime || 'native';
  if (!RUNTIMES.includes(runtime)) throw fail(`${at}.runtime must be one of ${RUNTIMES.join(', ')}.`);
  if (typeof b.file !== 'string' || !/^[\w.+-]{1,200}$/.test(b.file)) throw fail(`${at}.file must be a plain asset file name.`);
  if (!/\.zip$/i.test(b.file)) throw fail(`${at}.file must be a .zip package.`);
  if (!Number.isSafeInteger(b.size) || b.size <= 0) throw fail(`${at}.size must be a positive whole number of bytes.`);
  if (typeof b.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(b.sha256)) throw fail(`${at}.sha256 must be 64 hexadecimal characters.`);
  let executable;
  try { executable = safeRelative(b.executable, 'executable path'); } catch (e) { throw fail(`${at}.executable: ${e.message}`); }
  const args = b.args == null ? [] : b.args;
  if (!Array.isArray(args) || !args.every((a) => typeof a === 'string' && a.length < 4096)) throw fail(`${at}.args must be a list of strings.`);
  const req = b.requiredFiles == null ? [] : b.requiredFiles;
  if (!Array.isArray(req)) throw fail(`${at}.requiredFiles must be a list.`);
  const requiredFiles = req.map((r) => { try { return safeRelative(r, 'required file'); } catch (e) { throw fail(`${at}.requiredFiles: ${e.message}`); } });
  if (!requiredFiles.includes(executable)) requiredFiles.unshift(executable);
  const pre = b.preserve == null ? [] : b.preserve;
  if (!Array.isArray(pre)) throw fail(`${at}.preserve must be a list.`);
  const preserve = pre.map((r) => { try { return safeRelative(r, 'preserved path', { allowDirSuffix: true }); } catch (e) { throw fail(`${at}.preserve: ${e.message}`); } });
  return { os, arch, runtime, file: b.file, size: b.size, sha256: b.sha256.toLowerCase(), executable, args: args.slice(), requiredFiles, preserve };
}

/**
 * Check a parsed manifest and return a normalised copy. When `tagVersion` is given the manifest version must
 * match the release tag, so a manifest copied into the wrong release is caught.
 */
function validateManifest(m, { tagVersion, expectName } = {}) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw fail('The manifest is not a JSON object.');
  if (m.schema !== SCHEMA) throw fail(`Unsupported manifest schema ${JSON.stringify(m.schema)} (this launcher understands schema ${SCHEMA}).`);
  if (expectName && m.name !== expectName) throw fail(`The manifest is for "${m.name}", not "${expectName}".`);
  if (!semver.valid(m.version)) throw fail(`"${m.version}" is not a valid version number.`);
  const version = semver.parse(m.version).raw;
  if (tagVersion && semver.compare(version, tagVersion) !== 0) throw fail(`The manifest version ${version} does not match the release tag ${tagVersion}.`);
  if (m.minLauncherVersion != null && !semver.valid(m.minLauncherVersion)) throw fail('minLauncherVersion is not a valid version number.');
  if (m.releaseNotes != null && typeof m.releaseNotes !== 'string') throw fail('releaseNotes must be text.');
  if (!Array.isArray(m.builds) || !m.builds.length) throw fail('The manifest lists no builds.');
  if (m.builds.length > 64) throw fail('The manifest lists too many builds.');
  const builds = m.builds.map(validateBuild);
  const seen = new Set();
  for (const b of builds) {
    const k = `${b.os}/${b.arch}`;
    if (seen.has(k)) throw fail(`Two builds target ${k}.`);
    seen.add(k);
  }
  return {
    schema: SCHEMA, name: m.name || '', version,
    releaseNotes: m.releaseNotes || '',
    minLauncherVersion: m.minLauncherVersion || null,
    builds,
  };
}

module.exports = { validateManifest, validateBuild, SCHEMA, RUNTIMES };
