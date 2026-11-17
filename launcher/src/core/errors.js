'use strict';
/**
 * One error type for everything the launcher can report. `kind` drives the message shown to the player
 * and whether a retry is likely to help.
 */
class LauncherError extends Error {
  constructor(kind, message, { detail, cause, retryable = true, data } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'LauncherError';
    this.kind = kind;
    this.detail = detail || '';
    this.retryable = retryable;
    if (data) this.data = data;
  }
}

const KINDS = {
  network: 'network',
  rateLimit: 'rate-limit',
  notFound: 'not-found',
  http: 'http',
  manifest: 'manifest',
  noRelease: 'no-release',
  noBuild: 'no-compatible-build',
  launcherTooOld: 'launcher-too-old',
  integrity: 'integrity',
  archive: 'archive',
  install: 'install',
  locked: 'locked',
  gameRunning: 'game-running',
  launch: 'launch',
  aborted: 'aborted',
  config: 'config',
};

/** Turn any error into a short title and a plain explanation for the launcher screen. */
function describeError(err) {
  if (!(err instanceof LauncherError)) {
    return { kind: 'unknown', title: 'Something went wrong', detail: (err && err.message) || String(err), retryable: true };
  }
  const titles = {
    network: 'Could not reach the update server',
    'rate-limit': 'GitHub is limiting update checks',
    'not-found': 'Game releases could not be found',
    http: 'The update server returned an error',
    manifest: 'The release information is invalid',
    'no-release': 'No game release has been published yet',
    'no-compatible-build': 'No build for this computer',
    'launcher-too-old': 'This launcher needs an update',
    integrity: 'The download was damaged',
    archive: 'The game package is damaged',
    install: 'The update could not be installed',
    locked: 'Another launcher is updating the game',
    'game-running': 'The game is still running',
    launch: 'The game could not be started',
    aborted: 'The update was cancelled',
    config: 'The launcher is misconfigured',
  };
  return {
    kind: err.kind,
    title: titles[err.kind] || 'Something went wrong',
    detail: [err.message, err.detail].filter(Boolean).join(' '),
    retryable: err.retryable,
  };
}

module.exports = { LauncherError, KINDS, describeError };
