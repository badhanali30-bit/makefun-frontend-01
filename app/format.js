// Small helpers for showing API values. No dependencies.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 0.5, null) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A plain count with thousands separators. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** 1,240 -> '1.2k', for cramped spots like entry counts. */
export function compact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** A deadline as a date in UTC, e.g. 'Nov 17, 2026, 12:30 PM UTC'. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** A short date, e.g. 'Nov 17, 2026'. */
export function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Milliseconds until a deadline, negative once past. */
export function msLeft(iso) {
  return new Date(iso).getTime() - Date.now();
}

/** The time until a deadline: '2d 4h left', '35m left', '12s left', or 'ended'. */
export function timeLeft(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

/** 'Open' vs 'Closed' by the deadline, never by the API status alone:
    a bounty past its deadline may still read status open until results publish. */
export function isOpen(b) {
  return msLeft(b.deadline) > 0;
}

/** 1 -> '1 entry', 5 -> '5 entries'. */
export function entriesLabel(n) {
  return `${num(n)} ${Number(n) === 1 ? 'entry' : 'entries'}`;
}
