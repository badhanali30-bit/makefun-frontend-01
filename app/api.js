// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Speed rules this layer follows:
//  - one in-flight request per URL (concurrent views share it, never double-fetch),
//  - answers cached in memory for 60 s, then revalidated with If-None-Match:
//    the API's ETags are bound to the minute, so a revalidation inside the
//    same minute answers 304 and costs almost nothing,
//  - the board asks for activity=times (no per-entry activity) and a big
//    limit so the whole board is one request.

const API = 'https://make.fun/api';
const TTL_MS = 60_000;

const cache = new Map(); // url -> { etag, body, at }
const inflight = new Map(); // url -> Promise<body>

async function fetchJson(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body;

  const pending = inflight.get(url);
  if (pending) return pending;

  const job = (async () => {
    const headers = {};
    if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
    const res = await fetch(url, { headers });
    if (res.status === 304 && hit) {
      hit.at = Date.now();
      return hit.body;
    }
    if (!res.ok) {
      const err = new Error(`make.fun API ${res.status} for ${path}`);
      err.status = res.status;
      throw err;
    }
    const body = await res.json();
    cache.set(url, { etag: res.headers.get('ETag'), body, at: Date.now() });
    return body;
  })();

  inflight.set(url, job);
  try {
    return await job;
  } finally {
    inflight.delete(url);
  }
}

/** Drop one cached answer (used by the board's Refresh button). */
export function bust(path) {
  cache.delete(API + path);
}

/** Drop every cached answer. */
export function bustAll() {
  cache.clear();
}

/** The board: live bounties, or closed ones, in one request. */
export const getBounties = (status = 'open') =>
  fetchJson(`/competitions?status=${status}&activity=times&limit=100`);

/** Every bounty the API lists, whatever its status — the closed board
    cuts this by deadline in the browser (see format.isOpen). */
export const getAllBounties = () => fetchJson('/competitions?activity=times&limit=100');

/** One bounty, by its slug. */
export const getBounty = (slug) => fetchJson(`/competitions/${encodeURIComponent(slug)}`);

/**
 * A bounty's leaderboard. rows=first returns only the top 10 — the fast
 * default, since a full board can be megabytes (tiny-chess: ~8 MB).
 * rows=all is fetched only when the reader asks for it.
 */
export const getLeaderboard = (slug, { view, rows = 'first' } = {}) => {
  const q = new URLSearchParams({ rows });
  if (view) q.set('view', view);
  return fetchJson(`/competitions/${encodeURIComponent(slug)}/leaderboard?${q}`);
};

/** An account's public profile, by handle. */
export const getProfile = (handle) => fetchJson(`/profiles/${encodeURIComponent(handle)}`);

/** Absolute URL of an API-relative image (avatars, share cards). */
export function apiImage(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://make.fun${path}`;
}
