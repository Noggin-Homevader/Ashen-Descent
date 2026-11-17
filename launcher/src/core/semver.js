'use strict';
/** Semantic Versioning 2.0.0 parsing and precedence (https://semver.org). */
const RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function parse(v) {
  if (typeof v !== 'string') return null;
  const m = RE.exec(v.trim());
  if (!m) return null;
  return {
    major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]),
    pre: m[4] ? m[4].split('.') : [],
    build: m[5] || '',
    raw: v.trim().replace(/^v/, ''),
  };
}

function valid(v) { return parse(v) !== null; }

function cmpIdent(a, b) {
  const an = /^\d+$/.test(a), bn = /^\d+$/.test(b);
  if (an && bn) return Math.sign(Number(a) - Number(b));
  if (an) return -1;
  if (bn) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** -1, 0 or 1. Build metadata is ignored, as the spec requires. Throws on invalid input. */
function compare(a, b) {
  const x = typeof a === 'string' ? parse(a) : a, y = typeof b === 'string' ? parse(b) : b;
  if (!x || !y) throw new TypeError(`Invalid version: ${!x ? a : b}`);
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] > y[k] ? 1 : -1;
  if (!x.pre.length && !y.pre.length) return 0;
  if (!x.pre.length) return 1;
  if (!y.pre.length) return -1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    if (i >= x.pre.length) return -1;
    if (i >= y.pre.length) return 1;
    const c = cmpIdent(x.pre[i], y.pre[i]);
    if (c) return c;
  }
  return 0;
}

function isPrerelease(v) { const p = parse(v); return !!(p && p.pre.length); }

/** A version string that is safe to use as a folder name on every OS. */
function folderName(v) {
  const p = parse(v);
  if (!p) throw new TypeError(`Invalid version: ${v}`);
  return p.raw.replace(/\+/g, '_');
}

module.exports = { parse, valid, compare, isPrerelease, folderName };
