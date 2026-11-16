// An account's public profile: avatar, bio, record and every solution
// it has entered, each linking back to its bounty.

import { apiImage, getProfile } from '../api.js';
import { date, esc, money, num, shortDate } from '../format.js';

function stat(value, label) {
  return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
}

function solution(s) {
  const c = s.competition || {};
  const placement = s.placement != null ? `#${s.placement}` : 'Unranked';
  const score = s.score?.display != null ? `${esc(s.score.column?.title || 'Score')}: ${esc(s.score.display)}` : '';
  return `<li>
    <div class="row1">
      <a href="#/bounty/${encodeURIComponent(c.slug || '')}">${esc(c.title || c.slug || 'Bounty')}</a>
      <span class="pill">${esc(placement)}</span>
      ${s.prize_usd ? `<span class="prize">${money(s.prize_usd)}</span>` : ''}
    </div>
    <div class="t">${esc(s.title || '')}</div>
    <div class="t">${score}${score && s.entered_at ? ' · ' : ''}Entered ${shortDate(s.entered_at)}${c.deadline ? ` · deadline ${shortDate(c.deadline)}` : ''}${c.pot_usd ? ` · pot ${money(c.pot_usd)}` : ''}</div>
  </li>`;
}

export async function show(el, handle) {
  document.title = `@${handle} — make.fun`;
  el.innerHTML = '<p class="loading">Loading profile…</p>';
  let p;
  try {
    p = await getProfile(handle);
  } catch (err) {
    if (err.status === 404) p = null;
    else throw err;
  }
  if (!p || p.success === false || !p.handle) {
    el.innerHTML = `
      <p class="crumb"><a href="#/">← All bounties</a></p>
      <div class="error"><h1>No profile @${esc(handle)}</h1>
      <p>make.fun has no public profile under that handle. Check the spelling — handles are lowercase, like <code>nightshift-labs</code>.</p>
      <p><a class="btn" href="#/">Back to the board</a></p></div>`;
    return;
  }
  document.title = `@${p.handle} — make.fun`;
  const r = p.record || {};
  const solutions = p.solutions || [];
  const img = p.avatar?.url || p.image;

  el.innerHTML = `
    <p class="crumb"><a href="#/">← All bounties</a></p>
    <div class="profile-head">
      ${img ? `<img crossorigin="anonymous" src="${esc(apiImage(img))}" alt="Avatar of @${esc(p.handle)}" width="88" height="88">` : ''}
      <div>
        <h1>${esc(p.display_name || `@${p.handle}`)}</h1>
        <div class="handle">@${esc(p.handle)}${p.house ? ' · house account' : ''}</div>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        <div class="meta">
          <span>Joined ${date(p.joined_at)}</span>
          ${p.github_login ? `<span>GitHub: ${esc(p.github_login)}</span>` : ''}
          ${p.x ? `<span>X: ${esc(p.x)}</span>` : ''}
          ${p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : ''}
          ${p.wallet?.explorer_url ? `<span><a href="${esc(p.wallet.explorer_url)}">Solana wallet ↗</a></span>` : ''}
        </div>
      </div>
    </div>
    <div class="stats">
      ${stat(num(r.competitions_entered), 'bounties entered')}
      ${stat(num(r.competitions_placed), 'placements')}
      ${stat(num(r.competitions_won), 'wins')}
      ${stat(r.best_placement != null ? `#${r.best_placement}` : '—', 'best placement')}
      ${stat(num(r.podium_finishes), 'podium finishes')}
      ${stat(money(r.prize_usd), 'prizes won')}
    </div>
    <h2>Entries (${solutions.length})</h2>
    ${solutions.length
      ? `<ul class="solutions">${solutions.map(solution).join('')}</ul>`
      : '<p class="muted">No public entries yet.</p>'}`;
}
