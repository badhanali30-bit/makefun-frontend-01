// A bounty's leaderboard: rank, account, entry and its live scores.
// The API answers the whole board in one (sometimes multi-megabyte)
// response, so the fast default is rows=first — the top 10 only — and the
// full board loads only when the reader asks for it, 50 rows at a time.

import { apiImage, getLeaderboard } from '../api.js';
import { esc, num } from '../format.js';

const PAGE = 50;

function scoreCells(entry, columns) {
  return columns
    .filter((c) => !c.hidden)
    .map((c) => {
      const shown = entry.display && entry.display[c.key] != null ? entry.display[c.key] : entry.values?.[c.key];
      return `<td class="num">${esc(shown ?? '—')}</td>`;
    })
    .join('');
}

function row(entry, columns) {
  const img = entry.image
    ? `<img crossorigin="anonymous" loading="lazy" src="${esc(apiImage(entry.image))}" alt="" width="32" height="32">`
    : '<span class="who-img-fallback" aria-hidden="true"></span>';
  const title = entry.title ? `<span class="t">${esc(entry.title)}</span>` : '';
  const house = entry.house ? '<span class="badge-house">house</span>' : '';
  const rank = entry.rank != null ? entry.rank : '—';
  return `<tr>
    <td><span class="rank">#${rank}</span></td>
    <td><span class="who">${img}<span><a class="h" href="#/u/${encodeURIComponent(entry.handle)}">${esc(entry.handle)}</a>${house}${title}</span></span></td>
    ${scoreCells(entry, columns)}
  </tr>`;
}

export async function show(el, slug, { view } = {}) {
  document.title = 'Leaderboard — make.fun';
  el.innerHTML = '<p class="loading">Loading leaderboard…</p>';
  const data = await getLeaderboard(slug, { view });
  const columns = (data.columns || []).filter((c) => !c.hidden);
  const title = data.competition?.title || slug;
  document.title = `${title} — leaderboard — make.fun`;

  let entries = data.entries || [];
  let full = false;
  let shown = PAGE;

  el.innerHTML = `
    <p class="crumb"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(title)}</a></p>
    <div class="lb-head">
      <h1>Leaderboard</h1>
      <span class="sp">${esc(data.title || 'Results')} · ranked by ${esc(data.rank_key || 'score')}</span>
    </div>
    <p class="lede">${esc(data.competition?.status === 'resolved' ? 'Final standings.' : 'Live standings — scores move as entries land and are judged.')}</p>
    ${(data.views || []).length > 1 ? `<p class="small">Views: ${data.views.map((v) => v === data.view
      ? `<b>${esc(v)}</b>`
      : `<a href="#/bounty/${encodeURIComponent(slug)}/leaderboard?view=${encodeURIComponent(v)}">${esc(v)}</a>`).join(' · ')}</p>` : ''}
    ${entries.length === 0
      ? '<p class="empty">No ranked entries yet — check back once entries land.</p>'
      : `<div class="table-wrap"><table>
        <thead><tr><th>Rank</th><th>Entry</th>${columns.map((c) => `<th class="num">${esc(c.title)}</th>`).join('')}</tr></thead>
        <tbody id="rows"></tbody>
      </table></div>
      <p class="center"><span class="muted small" id="shown-note"></span></p>
      <p class="center"><button class="btn ghost" id="more" type="button">Load full leaderboard</button></p>`}`;

  const rowsEl = el.querySelector('#rows');
  const noteEl = el.querySelector('#shown-note');
  const moreBtn = el.querySelector('#more');
  if (!rowsEl) return;

  function paint() {
    const slice = entries.slice(0, full ? shown : Math.min(entries.length, 10));
    rowsEl.innerHTML = slice.map((e) => row(e, columns)).join('');
    noteEl.textContent = full
      ? `Showing ${slice.length} of ${num(entries.length)} ranked entries.`
      : `Top ${slice.length} — the fast view. The full board can be large; load it below.`;
    moreBtn.textContent = full
      ? (shown < entries.length ? `Show more (${num(entries.length - shown)} left)` : 'Full board loaded')
      : 'Load full leaderboard';
    moreBtn.disabled = full && shown >= entries.length;
  }

  moreBtn.addEventListener('click', async () => {
    if (!full) {
      moreBtn.disabled = true;
      moreBtn.textContent = 'Loading full board…';
      const all = await getLeaderboard(slug, { view, rows: 'all' });
      entries = all.entries || entries;
      full = true;
      shown = PAGE;
      moreBtn.disabled = false;
    } else {
      shown += PAGE;
    }
    paint();
  });
  paint();
}
