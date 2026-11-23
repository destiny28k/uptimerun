// Read helpers for the dashboard. All queries are scoped to the logged-in user.
import type { Status } from '../data/mock';

export const INTERVALS = [
  { sec: 30, label: '30 sec' },
  { sec: 60, label: '1 min' },
  { sec: 300, label: '5 min' },
  { sec: 900, label: '15 min' },
  { sec: 3600, label: '1 hour' },
];

export interface Monitor {
  id: string;
  name: string;
  url: string;
  type: 'http' | 'keyword';
  keyword: string | null;
  interval_sec: number;
  status: Status;
  last_ms: number | null;
  last_error: string | null;
  last_checked_at: number | null;
  history: string;
  ms_history: string;
  status_since: number | null;
  created_at: number;
  domain_expires_at: number | null;
  ssl_expires_at: number | null;
  ssl_issuer: string | null;
  expiry_checked_at: number;
  uptime30?: number | null;
}

export interface Incident {
  id: string;
  monitor_id: string;
  monitor_name: string;
  cause: string;
  started_at: number;
  resolved_at: number | null;
}

/** Turns the 'uudu' history string into bars, padded with grey "no data" on the left. */
export function toBars(history: string, length = 60): Status[] {
  const bars = history.split('').map((c) => (c === 'u' ? 'up' : 'down')) as Status[];
  return [...Array(Math.max(0, length - bars.length)).fill('paused'), ...bars].slice(-length);
}

export function intervalLabel(sec: number) {
  return INTERVALS.find((i) => i.sec === sec)?.label ?? `${Math.round(sec / 60)} min`;
}

export function ago(ts: number | null) {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

export function fmtUptime(v: number | null | undefined) {
  if (v == null) return '—';
  return v >= 100 ? '100%' : `${(Math.floor(v * 100) / 100).toFixed(2)}%`;
}

function dayOffset(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export async function listMonitors(db: D1Database, userId: string) {
  const { results } = await db.prepare(
    `SELECT m.*, (SELECT 100.0 * SUM(s.up) / NULLIF(SUM(s.total), 0) FROM daily_stats s
       WHERE s.monitor_id = m.id AND s.day >= ?) AS uptime30
     FROM monitors m WHERE m.user_id = ? ORDER BY m.created_at`,
  ).bind(dayOffset(29), userId).all<Monitor>();
  return results;
}

export async function countMonitors(db: D1Database, userId: string) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM monitors WHERE user_id = ?`).bind(userId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getMonitor(db: D1Database, userId: string, id: string) {
  return db.prepare(`SELECT * FROM monitors WHERE id = ? AND user_id = ?`).bind(id, userId).first<Monitor>();
}

/** Uptime % and average response for the last N days (1 = today only). */
export async function periodStats(db: D1Database, monitorId: string, days: number) {
  const row = await db.prepare(
    `SELECT SUM(total) AS total, SUM(up) AS up, SUM(sum_ms) AS sum_ms FROM daily_stats WHERE monitor_id = ? AND day >= ?`,
  ).bind(monitorId, dayOffset(days - 1)).first<{ total: number | null; up: number | null; sum_ms: number | null }>();
  const total = row?.total ?? 0;
  return {
    uptime: total ? (100 * (row!.up ?? 0)) / total : null,
    avgMs: row?.up ? Math.round((row.sum_ms ?? 0) / row.up) : null,
    checks: total,
  };
}

export async function listIncidents(db: D1Database, userId: string, monitorId?: string, limit = 10) {
  const where = monitorId ? 'i.user_id = ? AND i.monitor_id = ?' : 'i.user_id = ?';
  const binds = monitorId ? [userId, monitorId, limit] : [userId, limit];
  const { results } = await db.prepare(
    `SELECT i.*, m.name AS monitor_name FROM incidents i JOIN monitors m ON m.id = i.monitor_id
     WHERE ${where} ORDER BY i.started_at DESC LIMIT ?`,
  ).bind(...binds).all<Incident>();
  return results;
}
