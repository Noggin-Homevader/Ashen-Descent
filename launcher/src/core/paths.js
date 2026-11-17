'use strict';
const path = require('path');
const { LauncherError } = require('./errors');

const WIN_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const BAD_CHARS = /[<>:"|?*\u0000-\u001f]/;

/**
 * Validate a relative path that came from a release (an archive entry, the executable, a required file).
 * Returns it normalised to forward slashes. Rejects anything that is absolute, climbs out with "..",
 * names a drive, or uses characters or names Windows cannot store.
 */
function safeRelative(p, what = 'path', { allowDirSuffix = false } = {}) {
  const bad = (why) => new LauncherError('archive', `Unsafe ${what} "${String(p).slice(0, 200)}": ${why}.`, { retryable: false });
  if (typeof p !== 'string' || !p.length) throw bad('empty');
  if (p.length > 1024) throw bad('too long');
  const s = p.replace(/\\/g, '/');
  if (s.startsWith('/') || /^[a-zA-Z]:/.test(s) || s.startsWith('//')) throw bad('absolute paths are not allowed');
  const isDir = s.endsWith('/');
  const parts = s.split('/').filter((x) => x !== '' && x !== '.');
  if (!parts.length) throw bad('empty');
  for (const part of parts) {
    if (part === '..') throw bad('it points outside the install folder');
    if (BAD_CHARS.test(part)) throw bad('it contains characters that are not allowed in file names');
    if (WIN_RESERVED.test(part)) throw bad('it uses a reserved file name');
    if (/[. ]$/.test(part)) throw bad('a name ends with a dot or space');
  }
  if (isDir && !allowDirSuffix) throw bad('expected a file');
  return parts.join('/');
}

/** Join a validated relative path onto a base folder and prove the result is still inside that folder. */
function resolveInside(base, rel) {
  const abs = path.resolve(base, ...rel.split('/'));
  const r = path.relative(path.resolve(base), abs);
  if (!r || r.startsWith('..') || path.isAbsolute(r)) {
    throw new LauncherError('archive', `Refusing to write outside the install folder: ${rel}`, { retryable: false });
  }
  return abs;
}

/** True when `child` is strictly inside `parent` (not equal to it). */
function isStrictlyInside(parent, child) {
  const r = path.relative(path.resolve(parent), path.resolve(child));
  return !!r && !r.startsWith('..') && !path.isAbsolute(r);
}

module.exports = { safeRelative, resolveInside, isStrictlyInside };
