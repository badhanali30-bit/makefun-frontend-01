// Router and shell for the make.fun bounty board.
//
//   #/                              the board (live bounties)
//   #/closed                        closed bounties, cut by deadline
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/u/<handle>                    an account's public profile
//
// The board is in the first load; the other views load on demand with a
// literal import(), so the first load stays small. window.__shotReady is
// false while a route loads and true once its data is on screen, so a
// screenshot script knows when to capture.

import { show as showBoard } from './views/board.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');
const lookup = document.getElementById('lookup');

/** Live countdowns: rewrite only the [data-deadline] text nodes, once a
    second — the page is never rebuilt to tick. */
function tick() {
  const now = Date.now();
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    const next = timeLeft(el.getAttribute('data-deadline'));
    if (el.textContent !== next) el.textContent = next;
  });
  // Keep the tab honest: a deadline that just passed flips its pill.
  document.querySelectorAll('.pill.open, .pill.soon').forEach((pill) => {
    const span = pill.querySelector('[data-deadline]');
    if (span && new Date(span.getAttribute('data-deadline')).getTime() <= now) {
      pill.className = 'pill closed';
      pill.textContent = 'Closed';
    }
  });
}
setInterval(tick, 1000);

function errorView(err) {
  const msg = err && err.status === 404
    ? 'That bounty does not exist (yet) on make.fun.'
    : 'make.fun’s API did not answer. Check your connection and try again.';
  app.innerHTML = `
    <div class="error"><h1>Couldn’t load this page</h1>
    <p>${msg}</p>
    <p><button class="btn" id="retry" type="button">Try again</button>
    <a class="btn ghost" href="#/">Back to the board</a></p></div>`;
  document.getElementById('retry').addEventListener('click', render);
}

/** Split a hash route into its path parts and its ?query. */
function parseRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, params: new URLSearchParams(query || '') };
}

function markNav(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.getAttribute('data-nav') === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function render() {
  window.__shotReady = false;
  const { parts, params } = parseRoute();
  try {
    if (parts.length === 0) {
      markNav('board');
      await showBoard(app, { status: 'open' });
    } else if (parts[0] === 'closed' && parts.length === 1) {
      markNav('closed');
      await showBoard(app, { status: 'closed' });
    } else if (parts[0] === 'bounty' && parts[1]) {
      markNav('');
      const slug = decodeURIComponent(parts[1]);
      if (parts[2] === 'leaderboard') {
        const { show } = await import('./views/leaderboard.js');
        await show(app, slug, { view: params.get('view') || undefined });
      } else {
        const { show } = await import('./views/bounty.js');
        await show(app, slug);
      }
    } else if (parts[0] === 'u' && parts[1]) {
      markNav('');
      const { show } = await import('./views/profile.js');
      await show(app, decodeURIComponent(parts[1]));
    } else {
      markNav('board');
      await showBoard(app, { status: 'open' });
    }
  } catch (err) {
    errorView(err);
  }
  tick();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

/** Header lookup: Enter (or a pasted @handle) opens that profile. */
lookup.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const handle = lookup.value.trim().replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', render);
render();
