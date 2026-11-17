/* The launcher page: draws the game's title art and reflects the updater's state. All work happens in the main
   process; this page only shows state and forwards button presses through window.ashen (see preload.js). */
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const api = window.ashen;
  const BUSY = ['checking', 'downloading', 'installing', 'verifying'];
  if (api.platform === 'darwin') document.body.classList.add('mac');

  /* ---- title art from the game ---- */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = $('tstage');
  const portal = $('portal');
  try { stage.insertAdjacentHTML('beforeend', tLogo()); portal.insertAdjacentHTML('afterend', tRingSvg()); } catch (e) { console.warn(e); }
  let embers = $('embers');
  const startArt = () => {
    try { TPORT.mount(portal); } catch (e) { console.warn(e); }
    if (!reduced && !embers.isConnected) { const c = embers.cloneNode(); document.body.prepend(c); embers = c; }
    if (!reduced) { try { tEmbers(embers); } catch (e) { console.warn(e); } }
  };
  // While the game runs, the launcher stops its animations so the game gets the GPU.
  let artOn = true;
  const setArt = (on) => {
    if (on === artOn) return;
    artOn = on;
    if (on) { stage.insertBefore(portal, stage.firstChild); startArt(); } else { portal.remove(); embers.remove(); }
  };
  if (reduced) embers.remove();
  startArt();

  /* ---- formatting ---- */
  const bytes = (n) => {
    if (!(n >= 0)) return '?';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i && n < 100 ? 1 : 0)} ${u[i]}`;
  };
  const eta = (left, speed) => {
    if (!(speed > 0)) return '';
    const s = Math.ceil(left / speed);
    return s < 60 ? `${s}s left` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s left` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m left`;
  };
  const when = (iso) => { try { return iso ? new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : ''; } catch { return ''; } };
  const osName = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };

  /* ---- state -> page ---- */
  let S = null, notesKey = null, playing = false;
  function render(s) {
    S = s;
    const busy = BUSY.includes(s.phase);
    const b = document.body;
    b.classList.remove('booting');
    b.classList.toggle('busy', busy);
    b.classList.toggle('running', s.phase === 'running');
    setArt(s.phase !== 'running');

    // Play button
    const play = $('play');
    play.disabled = !s.canPlay || busy || playing;
    const inst = s.installed && s.installed.ok ? s.installed.version : null;
    let label;
    switch (s.phase) {
      case 'checking': label = 'Checking…'; break;
      case 'downloading': label = inst ? 'Updating…' : 'Downloading…'; break;
      case 'installing': label = 'Installing…'; break;
      case 'verifying': label = 'Verifying…'; break;
      case 'running': label = 'Game running'; break;
      case 'failed': label = s.canPlay && inst ? `Play ${inst}` : 'Unavailable'; break;
      default: label = s.error && s.error.offline ? 'Play offline' : 'Play';
    }
    $('playLabel').textContent = label;
    play.setAttribute('aria-label', label);
    $('status').textContent = s.message || '';

    // Versions
    const vi = $('vInst'), va = $('vAvail');
    vi.textContent = s.installed ? `${s.installed.version}${s.installed.ok ? '' : ' (damaged)'}` : 'Not installed';
    va.textContent = s.available ? s.available.version + (s.available.prerelease ? ' (test)' : '') : s.phase === 'checking' ? '…' : 'Unknown';
    va.classList.toggle('new', !!(s.available && (!s.installed || s.available.version !== s.installed.version)));
    const chan = $('chan'); chan.textContent = s.allowPrerelease ? 'Test builds' : 'Stable'; chan.classList.toggle('pre', !!s.allowPrerelease);

    // Problems and notices
    const al = $('alert');
    if (s.error) {
      al.hidden = false;
      al.classList.toggle('soft', !!s.error.offline);
      $('aTitle').textContent = s.error.title || 'Something went wrong';
      $('aText').textContent = s.error.offline ? `${s.error.detail} ${s.notice || ''}`.trim() : s.error.detail || '';
      $('retry').hidden = !s.canRetry;
      $('retry').disabled = busy;
    } else al.hidden = true;
    const note = $('note');
    const showNote = s.notice && !(s.error && s.error.offline);
    note.hidden = !showNote;
    if (showNote) note.textContent = s.notice;

    // Release notes
    const key = s.available ? `${s.available.version}|${s.available.notes}` : s.phase === 'checking' ? notesKey : 'none';
    if (key !== notesKey) {
      notesKey = key;
      if (!s.available && s.phase !== 'checking') {
        $('notes').innerHTML = '<p class="dim">Release notes appear here once the latest release is known.</p>';
        $('notesWhen').textContent = '';
      } else if (s.available) {
        $('notes').innerHTML = s.available.notes ? renderMarkdown(s.available.notes) : '<p class="dim">No release notes were published for this version.</p>';
        $('notesWhen').textContent = `${s.available.version}${s.available.publishedAt ? ` · ${when(s.available.publishedAt)}` : ''}`;
      }
    }

    // Settings
    const pre = $('pre'); pre.checked = !!s.allowPrerelease; pre.disabled = busy || s.phase === 'running';

    // Progress
    const p = s.progress, prog = $('prog'), fill = $('progFill'), txt = $('progText');
    const showProg = ['downloading', 'installing', 'verifying'].includes(s.phase);
    b.classList.toggle('showprog', showProg);
    prog.classList.toggle('ind', s.phase === 'verifying' || (s.phase === 'installing' && !(p && p.total)));
    if (s.phase === 'downloading' && p) {
      fill.style.width = `${Math.round((p.fraction || 0) * 1000) / 10}%`;
      const v = s.available ? s.available.version : '';
      txt.textContent = `Downloading ${v} — ${bytes(p.received)} of ${bytes(p.total)}${p.speed > 0 ? ` · ${bytes(p.speed)}/s · ${eta(p.total - p.received, p.speed)}` : ''}`;
    } else if (s.phase === 'installing') {
      fill.style.width = `${Math.round(((p && p.fraction) || 0) * 100)}%`;
      txt.textContent = p && p.total ? `Unpacking files — ${Math.round(p.fraction * 100)}%` : 'Unpacking files…';
    } else if (s.phase === 'verifying') txt.textContent = 'Checking every installed file against its checksum…';
    else txt.textContent = s.phase === 'running' ? 'The launcher will be ready again when you close the game.' : '';
    $('lver').textContent = `Launcher ${s.launcherVersion || ''}${s.platform ? ` · ${osName[s.platform.os] || s.platform.os} ${s.platform.arch}` : ''}`;
  }

  /* ---- controls ---- */
  $('play').addEventListener('click', async () => {
    if (!S || !S.canPlay || playing) return;
    playing = true; $('play').disabled = true;
    try {
      const r = await api.play();
      if (r && !r.ok && r.error) {
        render({ ...S, error: { ...r.error, offline: false }, canRetry: S.canRetry });
      }
    } finally { playing = false; if (S) render(S); }
  });
  $('retry').addEventListener('click', () => { $('retry').disabled = true; api.retry(); });
  $('logs').addEventListener('click', () => api.open('logs'));
  $('saves').addEventListener('click', () => api.open('saves'));
  $('releases').addEventListener('click', () => api.openReleasePage());
  $('pre').addEventListener('change', (e) => api.setAllowPrerelease(e.target.checked));
  $('wmin').addEventListener('click', () => api.minimize());
  $('wclose').addEventListener('click', () => api.close());
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement === document.body && S && S.canPlay && !$('play').disabled) $('play').click();
  });
  api.onClosing && api.onClosing(() => { $('status').textContent = 'Finishing the installation before closing…'; });

  api.onState(render);
  api.getState().then((s) => { if (s) render(s); });
})();
