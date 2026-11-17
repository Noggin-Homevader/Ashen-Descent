'use strict';
/** The names used in release manifests for operating systems and CPU architectures. */
const OS = { win32: 'windows', darwin: 'macos', linux: 'linux' };
const ARCH = { x64: 'x64', arm64: 'arm64', ia32: 'x86', arm: 'arm' };

function current(proc = process) {
  return { os: OS[proc.platform] || proc.platform, arch: ARCH[proc.arch] || proc.arch };
}

/**
 * How well a manifest build fits this computer. Higher is better; 0 means it cannot run here.
 * Exact OS and CPU wins; a build for "any" CPU on this OS comes next; a platform-neutral ("any"/"any")
 * build last. Apple Silicon Macs can also run x64 builds through Rosetta.
 */
function score(build, plat) {
  const osOk = build.os === plat.os, osAny = build.os === 'any';
  const archOk = build.arch === plat.arch, archAny = build.arch === 'any';
  if (osOk && archOk) return 4;
  if (osOk && archAny) return 3;
  if (osOk && plat.os === 'macos' && plat.arch === 'arm64' && build.arch === 'x64') return 2;
  if (osAny && (archAny || archOk)) return 1;
  return 0;
}

function pickBuild(builds, plat) {
  let best = null, bs = 0;
  for (const b of builds) { const s = score(b, plat); if (s > bs) { best = b; bs = s; } }
  return best;
}

module.exports = { current, score, pickBuild, OS_NAMES: Object.values(OS), ARCH_NAMES: Object.values(ARCH) };
