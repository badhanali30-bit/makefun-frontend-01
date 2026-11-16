// The bounty board: every live bounty with its live pot, entry fee,
// deadline (ticking) and entries. One API request, then the list is
// filtered and sorted in the browser — no re-fetch while you type.

import { bust, getAllBounties, getBounties } from '../api.js';
import { compact, date, entriesLabel, esc, isOpen, money, msLeft, timeLeft } from '../format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** Deadline pill: green while open, gold under 24 h, grey once closed. */
function deadlinePill(b) {
  const ms = msLeft(b.deadline);
  if (ms <= 0) return '<span class="pill closed">Closed</span>';
  const cls = ms < 86400000 ? 'pill soon' : 'pill open';
  return `<span class="${cls}"><span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span></span>`;
}

function card(b) {
  const open = isOpen(b);
  const skills = (b.skills || []).slice(0, 3).map((s) => `<span class="pill">${esc(s)}</span>`).join('');
  return `
  <li class="card">
    <div class="card-top">
      <span class="cat">${esc(b.category || 'Bounty')}</span>
      ${deadlinePill(b)}
      <span class="sp">${esc(b.sponsor?.name || '')}${b.sponsor?.isVerified ? ' ✓' : ''}</span>
    </div>
    <h3><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
    <p class="summary">${esc(b.summary || '')}</p>
    <div class="card-facts">
      <span class="pot"><small>Live pot</small>${pot(b)}</span>
      <span class="fact">${b.entryFeeUsd ? `<b>${money(b.entryFeeUsd)}</b> entry fee` : '<b>Free</b> entry'}</span>
      <span class="fact">ends <b>${date(b.deadline)}</b></span>
    </div>
    ${skills ? `<div class="skills">${skills}</div>` : ''}
    <div class="card-foot">
      <span class="entries">${entriesLabel(b.submissionCount)}</span>
      <a href="#/bounty/${encodeURIComponent(b.slug)}">Details →</a>
      <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a>
    </div>
  </li>`;
}

export async function show(el, { status = 'open' } = {}) {
  document.title = status === 'open' ? 'make.fun bounties — live board' : 'Closed bounties — make.fun';
  el.innerHTML = '<p class="loading">Loading live bounties…</p>';
  // The API's status=open still lists bounties past their deadline (until
  // results publish), and status=closed lists none at all — so both boards
  // are cut by deadline in the browser, never by status alone.
  const data = status === 'open' ? await getBounties('open') : await getAllBounties();
  const all = [...(data.items || [])].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const items = status === 'open' ? all.filter(isOpen) : all.filter((b) => !isOpen(b));
  const closedCount = all.filter((b) => !isOpen(b)).length;
  const totalPot = items.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const totalEntries = items.reduce((sum, b) => sum + Number(b.submissionCount ?? 0), 0);

  el.innerHTML = `
    <h1>${status === 'open' ? 'Live bounties' : 'Closed bounties'}</h1>
    <p class="lede">${status === 'open'
      ? 'Every bounty still taking entries — live pot, entry fee, time left and entries, straight from make.fun’s public API.'
      : 'Bounties past their deadline. A bounty can still read “open” on the API until its results publish — this list is cut by deadline, not by status.'}</p>
    <div class="stats">
      <div class="stat"><b>${items.length}</b><span>${status === 'open' ? 'open now' : 'closed bounties'}</span></div>
      <div class="stat"><b>${money(totalPot)}</b><span>combined live pots</span></div>
      <div class="stat"><b>${compact(totalEntries)}</b><span>entries in total</span></div>
    </div>
    ${status === 'open' && closedCount ? `<p class="small muted">${closedCount} ${closedCount === 1 ? 'bounty has' : 'bounties have'} passed their deadline since the last listing — see <a href="#/closed">Closed</a>.</p>` : ''}
    <div class="toolbar">
      <input id="q" type="search" placeholder="Filter by title, category or skill…" aria-label="Filter bounties" autocomplete="off" spellcheck="false">
      <select id="sort" aria-label="Sort bounties">
        <option value="deadline">Soonest deadline</option>
        <option value="pot">Biggest pot</option>
        <option value="entries">Most entries</option>
      </select>
      <button class="btn ghost" id="refresh" type="button">Refresh</button>
      <span class="count" id="count"></span>
    </div>
    <ul class="cards" id="cards"></ul>
    <p class="empty" id="empty" hidden>No bounties match that filter.</p>`;

  const list = el.querySelector('#cards');
  const count = el.querySelector('#count');
  const empty = el.querySelector('#empty');
  const q = el.querySelector('#q');
  const sort = el.querySelector('#sort');

  function render() {
    const needle = q.value.trim().toLowerCase();
    let rows = items.filter((b) => {
      if (!needle) return true;
      const hay = `${b.title} ${b.category || ''} ${(b.skills || []).join(' ')} ${b.sponsor?.name || ''}`.toLowerCase();
      return hay.includes(needle);
    });
    if (sort.value === 'pot') rows.sort((a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0));
    else if (sort.value === 'entries') rows.sort((a, b) => Number(b.submissionCount ?? 0) - Number(a.submissionCount ?? 0));
    else rows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    list.innerHTML = rows.map(card).join('');
    count.textContent = `${rows.length} of ${items.length} shown`;
    empty.hidden = rows.length > 0;
  }

  q.addEventListener('input', render);
  sort.addEventListener('change', render);
  el.querySelector('#refresh').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Refreshing…';
    bust(status === 'open'
      ? '/competitions?status=open&activity=times&limit=100'
      : '/competitions?activity=times&limit=100');
    try {
      await show(el, { status });
    } finally {
      btn.disabled = false;
    }
  });
  render();
}
