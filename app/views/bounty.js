// One bounty's page: summary, description and rules (rendered Markdown),
// the rewards table with the live pot, dates, and status — open or closed
// by its deadline, never by the API status alone.

import { getBounty } from '../api.js';
import { date, entriesLabel, esc, isOpen, money, msLeft, num, shortDate, timeLeft } from '../format.js';
import { md } from '../md.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

function rewardsTable(b) {
  const now = b.rewardsNow && b.rewardsNow.length ? b.rewardsNow : null;
  const base = b.rewards && Object.keys(b.rewards).length ? b.rewards : null;
  if (!now && !base) return '<p class="muted">No rewards table published for this bounty yet.</p>';
  const rows = now
    ? now.map((r) => ({ place: r.place, base: r.baseUsd, fee: r.feeShareUsd, total: r.amountUsd }))
    : Object.entries(base).map(([place, amount]) => ({ place: Number(place), base: amount, fee: null, total: amount }));
  const feeNote = b.entryFeeUsd
    ? `<p class="small muted">Entry fees (${money(b.entryFeeUsd)} each, ${num(b.entryFeePayers)} paid so far) join the pot and are split over the places above — the “live” column is what each place pays right now.</p>`
    : '';
  return `
  <div class="table-wrap"><table>
    <thead><tr><th>Place</th><th class="num">Prize</th>${now ? '<th class="num">Fee share</th><th class="num">Live payout</th>' : ''}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td><span class="rank">#${r.place}</span></td><td class="num">${money(r.base)}</td>${now ? `<td class="num">${money(r.fee)}</td><td class="num"><b>${money(r.total)}</b></td>` : ''}</tr>`).join('')}
    </tbody>
  </table></div>${feeNote}`;
}

function phases(b) {
  const list = b.phases || [];
  if (!list.length) return '';
  return `
    <h2>Phases</h2>
    <ul>
      ${list.map((p) => `<li><b>${esc(p.title)}</b>${p.starts_at ? ` — ${shortDate(p.starts_at)}${p.ends_at ? ` to ${shortDate(p.ends_at)}` : ''}` : ''}${p.description ? `<br><span class="muted small">${esc(p.description)}</span>` : ''}</li>`).join('')}
    </ul>`;
}

export async function show(el, slug) {
  document.title = 'Loading bounty… — make.fun';
  el.innerHTML = '<p class="loading">Loading bounty…</p>';
  const b = await getBounty(slug);
  const open = isOpen(b);
  const ms = msLeft(b.deadline);
  document.title = `${b.title} — make.fun`;

  el.innerHTML = `
    <p class="crumb"><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary || '')}</p>
    <div class="status-banner ${open ? 'open' : 'closed'}">
      ${open
        ? `<b>Open — still taking entries.</b> Closes ${date(b.deadline)} (<span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>).`
        : `<b>Closed — the deadline passed ${date(b.deadline)}.</b> ${b.status === 'resolved' ? 'Results are published — see the leaderboard.' : 'Results are not published yet; the API may still read “open” until they are.'}`}
    </div>
    <div class="facts-grid">
      <div class="fact-box"><small>Live pot</small><b>${pot(b)}</b><span>${money(b.rewardAmount)} prize${b.entryFeeUsd ? ` + ${money(b.entryFeesUsd || 0)} in fees` : ''}</span></div>
      <div class="fact-box"><small>Entry fee</small><b>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</b><span>${b.entryFeeUsd ? `${num(b.entryFeePayers)} paid it` : 'no fee to enter'}</span></div>
      <div class="fact-box"><small>Entries</small><b>${num(b.submissionCount)}</b><span>${entriesLabel(b.submissionCount)}</span></div>
      <div class="fact-box"><small>Deadline</small><b>${shortDate(b.deadline)}</b><span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span></div>
    </div>
    <div class="actions">
      <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard</a>
      <a class="btn ghost" href="https://make.fun${esc(b.url || `/bounty/${b.slug}`)}">Open on make.fun ↗</a>
    </div>
    <div class="meta">
      <span><b>Category:</b> ${esc(b.category || '—')}</span>
      <span><b>Sponsor:</b> ${esc(b.sponsor?.name || '—')}${b.sponsor?.isVerified ? ' ✓' : ''}</span>
      <span><b>Published:</b> ${date(b.publishedAt)}</span>
      ${b.resolvedAt ? `<span><b>Resolved:</b> ${date(b.resolvedAt)}</span>` : ''}
      ${b.commentCount ? `<span><b>Comments:</b> ${num(b.commentCount)}</span>` : ''}
    </div>
    ${(b.skills || []).length ? `<p class="skills">${b.skills.map((s) => `<span class="pill">${esc(s)}</span>`).join('')}</p>` : ''}
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    ${b.description ? `<h2>Description</h2><div class="md">${md(b.description)}</div>` : ''}
    ${b.rules ? `<h2>Rules</h2><div class="md">${md(b.rules)}</div>` : ''}
    ${phases(b)}`;
}
