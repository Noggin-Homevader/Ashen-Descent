/* A deliberately small Markdown renderer for release notes. Everything is escaped first; only headings, lists,
   paragraphs, bold, italics, inline code and plain links survive. Links are shown as text, never opened. */
'use strict';
function mdEscape(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function mdInline(s) {
  return mdEscape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<b>${a || b}</b>`)
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((?:[^)\s]+)\)/g, '$1');
}
function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n').slice(0, 400);
  const out = []; let list = null, para = [];
  const flushP = () => { if (para.length) { out.push(`<p>${mdInline(para.join(' '))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map((i) => `<li>${mdInline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushP(); flushL(); continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { flushP(); flushL(); const n = Math.min(6, m[1].length + 3); out.push(`<h${n}>${mdInline(m[2])}</h${n}>`); continue; }
    if ((m = /^\s*[-*+]\s+(.*)$/.exec(line))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushP(); flushL(); out.push('<hr>'); continue; }
    flushL(); para.push(line.trim());
  }
  flushP(); flushL();
  return out.join('');
}
if (typeof module !== 'undefined') module.exports = { renderMarkdown };
