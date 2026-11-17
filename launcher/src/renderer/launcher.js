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
    $('locChange').disabled = busy || s.phase === 'running';
    $('mpChange').disabled = s.phase === 'running';

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

  /* ---- install location (which drive the game and saves go on) ---- */
  let LOC = null, pick = null;
  const LOW = 500 * 1048576;
  async function loadLocation() {
    try { LOC = await api.getLocation(); } catch { LOC = null; }
    if (!LOC) return;
    $('locShort').textContent = LOC.root; $('locShort').title = LOC.root;
    if (LOC.ask && $('loc').hidden) openLoc(true);
  }
  function openLoc(first) {
    const d = $('loc');
    d.hidden = false; d.classList.remove('moving'); d.dataset.first = first ? '1' : '';
    $('locMsg').textContent = '';
    $('locCancel').hidden = !!first;
    $('locT').textContent = first ? 'Choose where to install' : 'Change install location';
    $('locP').textContent = first
      ? 'Ashen Descent, its updates and your saves are stored on the drive you choose. The game needs about 100 MB.'
      : LOC.installed ? 'Your game and saves will be moved to the drive you choose. The launcher restarts when the move is done.' : 'Choose where the game will be installed.';
    $('locOk').textContent = first ? 'Install here' : LOC.installed ? 'Move here' : 'Use this drive';
    const cur = LOC.drives.find((x) => LOC.root.toUpperCase().startsWith(x.letter.toUpperCase()));
    pick = cur ? cur.letter : null;
    // First run on a nearly full drive: suggest the drive with the most room instead.
    if (first && (!cur || cur.free < 2 * 1024 ** 3)) { const best = LOC.drives.filter((x) => x.free >= LOW).sort((a, b) => b.free - a.free)[0]; if (best) pick = best.letter; }
    renderDrives();
    setTimeout(() => $('locOk').focus(), 0);
  }
  function renderDrives() {
    const box = $('drives');
    box.innerHTML = '';
    for (const x of LOC.drives) {
      const b = document.createElement('button');
      b.className = `drv${x.free < LOW ? ' low' : ''}`;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(x.letter === pick));
      b.disabled = x.free < LOW;
      b.title = x.free < LOW ? 'Not enough free space' : `Install on ${x.letter}`;
      b.innerHTML = `<b>${x.letter}<small>${x.system ? 'Windows' : ''}</small></b><span>${bytes(x.free)} free of ${bytes(x.total)}</span><u><s style="width:${Math.max(0, Math.min(100, Math.round((1 - x.free / x.total) * 100)))}%"></s></u>`;
      b.addEventListener('click', () => { pick = x.letter; renderDrives(); });
      box.appendChild(b);
    }
    box.hidden = !LOC.drives.length;
    const d = LOC.drives.find((x) => x.letter === pick);
    $('locPath').textContent = d ? d.root : LOC.root;
  }
  async function submitLoc(choice) {
    const box = $('loc');
    $('locMsg').textContent = '';
    const btns = [...box.querySelectorAll('button')];
    btns.forEach((b) => { b.disabled = true; });
    if (LOC.installed && !choice.keep && !choice.browse) { box.classList.add('moving'); $('locP').textContent = 'Moving your game and saves… Please keep the launcher open.'; }
    let r;
    try { r = await api.setLocation(choice); } catch (e) { r = { ok: false, error: { title: 'The location could not be changed', detail: String(e && e.message || e) } }; }
    if (r && r.ok) {
      if (r.restarting) { $('locP').textContent = 'Restarting the launcher…'; return; }
      box.hidden = true; loadLocation(); return;
    }
    btns.forEach((b) => { b.disabled = false; });
    box.classList.remove('moving');
    renderDrives();
    if (r && r.error) $('locMsg').textContent = `${r.error.title}. ${r.error.detail || ''}`.trim();
  }
  $('locChange').addEventListener('click', () => { if (LOC) openLoc(false); });
  $('locCancel').addEventListener('click', () => { $('loc').hidden = true; });
  $('locBrowse').addEventListener('click', () => submitLoc({ browse: true }));
  $('locOk').addEventListener('click', () => {
    const d = LOC.drives.find((x) => x.letter === pick);
    if (!d || d.root.toUpperCase() === LOC.root.toUpperCase()) return submitLoc({ keep: true });
    submitLoc({ drive: d.letter });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('loc').hidden && !$('loc').dataset.first && !$('loc').classList.contains('moving')) $('loc').hidden = true; });
  api.onLocationProgress && api.onLocationProgress((p) => { $('locFill').style.width = `${p.total ? Math.round((p.done / p.total) * 100) : 0}%`; });
  if (api.getLocation) loadLocation(); else document.querySelector('.locline').hidden = true;

  /* ---- party play ---- */
  let MPS = null, mpPick = null;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function mpSummary(m) {
    if (!m) return '…';
    if (m.mode === 'off') return 'Off';
    if (m.mode === 'host') return m.host.running ? `Hosting · ${m.host.players} connected` : 'Hosting failed';
    if (m.mode === 'join') return m.server ? `Joining ${m.join}` : 'Join: no address';
    if (!m.online) return 'Online · server not set up yet';
    const st = m.online.status;
    return !st || st.checking ? 'Online · connecting…' : st.ok ? `Online · ${st.players} playing` : 'Online · server unreachable';
  }
  function renderMp(m) {
    MPS = m;
    $('mpShort').textContent = mpSummary(m);
    if ($('mpd').hidden) return;
    for (const b of document.querySelectorAll('.mpc')) b.setAttribute('aria-checked', String(b.dataset.mode === mpPick));
    const st = m.online && m.online.status;
    $('mpOnline').innerHTML = !m.online ? 'Play with anyone on the Ashen Descent server.\nNot set up yet: use Host or Join for now.'
      : `Play with anyone on the Ashen Descent server.\n<i class="dot ${!st || st.checking ? 'wait' : st.ok ? 'on' : 'off'}"></i>${!st || st.checking ? 'Connecting… (a sleeping server can take up to a minute to wake)' : st.ok ? `Online · ${st.players} playing` : `Unreachable (${esc(st.error || 'no answer')})`}`;
    const addrs = m.host.addresses || [];
    $('mpHost').innerHTML = `Your friends connect to you. The launcher keeps hosting from the tray while you play.${m.mode === 'host'
      ? m.host.running ? `\n<i class="dot on"></i>Hosting. Friends join with: <em>${addrs.map(esc).join('</em> or <em>') || 'this PC’s address'}</em>` : `\n<i class="dot off"></i>${esc(m.host.error || 'Not running')}`
      : '\nSame network: works as is. Over the internet: forward port ' + m.host.port + ' or use a virtual LAN (Tailscale, ZeroTier, Radmin VPN).'}`;
  }
  function openMp() {
    if (!MPS) return;
    mpPick = MPS.mode; $('mpJoin').value = MPS.join || ''; $('mpMsg').textContent = '';
    $('mpd').hidden = false; renderMp(MPS);
  }
  for (const b of document.querySelectorAll('.mpc')) {
    const pickIt = () => { mpPick = b.dataset.mode; renderMp(MPS); if (mpPick === 'join') setTimeout(() => $('mpJoin').focus(), 0); };
    b.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') pickIt(); });
    b.addEventListener('keydown', (e) => { if (e.target === b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickIt(); } });
  }
  $('mpJoin').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('mpSave').click(); });
  $('mpChange').addEventListener('click', openMp);
  $('mpCancel').addEventListener('click', () => { $('mpd').hidden = true; });
  $('mpSave').addEventListener('click', async () => {
    $('mpSave').disabled = true; $('mpMsg').textContent = '';
    try {
      const m = await api.setMultiplayer({ mode: mpPick, join: $('mpJoin').value });
      if (m && m.error) { $('mpMsg').textContent = m.error; renderMp(m); return; }
      if (m && m.mode === 'host' && !m.host.running) { renderMp(m); $('mpMsg').textContent = m.host.error || 'Hosting could not start.'; return; }
      renderMp(m); $('mpd').hidden = true;
    } finally { $('mpSave').disabled = false; }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('mpd').hidden) $('mpd').hidden = true; });
  if (api.getMultiplayer) { api.getMultiplayer().then(renderMp).catch(() => {}); api.onMultiplayer(renderMp); } else document.querySelector('.mpline').hidden = true;

  api.onState(render);
  api.getState().then((s) => { if (s) render(s); });
})();
