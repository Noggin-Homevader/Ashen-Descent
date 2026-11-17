'use strict';
/**
 * Reads public GitHub Releases. No token is ever sent: unauthenticated requests are allowed 60 calls an hour
 * per IP address, and the launcher makes one per check. Responses are cached with their ETag, and GitHub does not
 * count a "304 Not Modified" reply against that limit. If the limit is hit anyway, the last cached list is used.
 */
const fs = require('fs');
const path = require('path');
const { LauncherError } = require('./errors');

const MAX_RELEASES_JSON = 8 * 1024 * 1024;
const MAX_MANIFEST_JSON = 1024 * 1024;

async function readLimited(res, limit) {
  const len = Number(res.headers.get('content-length'));
  if (len && len > limit) throw new LauncherError('manifest', 'The server sent more data than expected.', { retryable: false });
  if (!res.body) return Buffer.alloc(0);
  const chunks = []; let n = 0;
  for await (const c of res.body) {
    n += c.length;
    if (n > limit) throw new LauncherError('manifest', 'The server sent more data than expected.', { retryable: false });
    chunks.push(Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

function networkError(err, what) {
  const cause = err && (err.cause || err);
  const code = cause && (cause.code || cause.name);
  const timeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
  return new LauncherError('network', timeout ? `${what} timed out.` : `${what} failed.`, {
    detail: timeout ? 'Check your internet connection and try again.' : `Check your internet connection and try again.${code ? ` (${code})` : ''}`,
    cause: err,
  });
}

class FileCache {
  constructor(file) { this.file = file; }
  get() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return null; } }
  set(v) {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(v));
      fs.renameSync(tmp, this.file);
    } catch { /* a cache that cannot be written only costs an extra request */ }
  }
}

class GitHubClient {
  /**
   * @param {object} o
   * @param {Function} o.fetch           WHATWG fetch (Electron's net.fetch in the app, global fetch in tests)
   * @param {string} o.apiBaseUrl
   * @param {string} o.owner
   * @param {string} o.repo
   * @param {string} o.userAgent
   * @param {number} [o.timeoutMs]
   * @param {{get():any,set(v:any):void}} [o.cache]
   */
  constructor(o) {
    this.fetch = o.fetch; this.api = o.apiBaseUrl; this.owner = o.owner; this.repo = o.repo;
    this.ua = o.userAgent || 'AshenDescentLauncher'; this.timeoutMs = o.timeoutMs || 20000;
    this.cache = o.cache || { get: () => null, set: () => {} };
  }

  async _get(url, headers, what) {
    try {
      return await this.fetch(url, { headers: { 'User-Agent': this.ua, ...headers }, redirect: 'follow', signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (e) { throw networkError(e, what); }
  }

  /** The repository's releases, newest first as GitHub returns them. Resolves to { releases, stale }. */
  async listReleases() {
    const url = `${this.api}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/releases?per_page=30`;
    const cached = this.cache.get();
    const usable = cached && cached.url === url && Array.isArray(cached.body);
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (usable && cached.etag) headers['If-None-Match'] = cached.etag;
    const res = await this._get(url, headers, 'Checking for updates');
    if (res.status === 304 && usable) return { releases: cached.body, stale: false };
    if (res.status === 200) {
      let body;
      try { body = JSON.parse((await readLimited(res, MAX_RELEASES_JSON)).toString('utf8')); } catch (e) {
        if (e instanceof LauncherError) throw e;
        throw new LauncherError('manifest', 'GitHub sent a release list that could not be read.', { cause: e });
      }
      if (!Array.isArray(body)) throw new LauncherError('manifest', 'GitHub sent an unexpected reply instead of a release list.');
      this.cache.set({ url, etag: res.headers.get('etag') || null, body, at: Date.now() });
      return { releases: body, stale: false };
    }
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    const retryAfter = Number(res.headers.get('retry-after'));
    if (res.status === 429 || (res.status === 403 && (remaining === '0' || retryAfter > 0))) {
      if (usable) return { releases: cached.body, stale: true };
      const at = retryAfter > 0 ? Date.now() + retryAfter * 1000 : reset > 0 ? reset * 1000 : 0;
      const when = at ? ` Try again after ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : ' Try again in a little while.';
      throw new LauncherError('rate-limit', 'Too many update checks were made from your network.', { detail: when.trim(), data: { resetAt: at || null } });
    }
    if (res.status === 404) {
      throw new LauncherError('not-found', `The repository ${this.owner}/${this.repo} was not found.`, {
        detail: 'It may have been renamed, or made private. Private repositories need a different way to share builds (see docs/LAUNCHER.md).',
        retryable: false,
      });
    }
    if (res.status === 401 || res.status === 403) throw new LauncherError('http', `GitHub refused the request (HTTP ${res.status}).`);
    throw new LauncherError('http', `GitHub replied with HTTP ${res.status}.`, { detail: res.status >= 500 ? 'GitHub may be having trouble. Try again shortly.' : '' });
  }

  /** Download and parse a release's manifest asset (a small JSON file). */
  async fetchJsonAsset(url) {
    const res = await this._get(url, { Accept: 'application/octet-stream' }, 'Downloading the release information');
    if (res.status !== 200) {
      if (res.status === 404) throw new LauncherError('manifest', 'The release information file is missing.');
      throw new LauncherError('http', `Downloading the release information failed (HTTP ${res.status}).`);
    }
    const buf = await readLimited(res, MAX_MANIFEST_JSON);
    try { return JSON.parse(buf.toString('utf8')); } catch (e) {
      throw new LauncherError('manifest', 'The release information file is not valid JSON.', { cause: e, retryable: false });
    }
  }
}

module.exports = { GitHubClient, FileCache, networkError, readLimited };
