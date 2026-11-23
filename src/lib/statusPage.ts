// Builds the data for a public status page from real monitors, daily stats and incidents.
import { formatDuration } from './alerts';

export const STATUS_DAYS = 90;
export const FREE_STATUS_PAGE_LIMIT = 1;

export interface Day { date: string; up: number | null }
export interface Service { name: string; status: 'up' | 'down' | 'pending'; uptime: string; days: Day[] }
export interface IncidentView {
  date: string; title: string; impact: string; duration: string;
  updates: { status: string; time: string; text: string }[];
}
export interface StatusPageData {
  title: string;
  subtitle: string;
  description?: string | null;
  overall: { state: 'ok' | 'partial' | 'major' | 'empty'; label: string; note: string };
  stats: { uptime: string; avgMs: string; incidents: number };
  groups: { name?: string; services: Service[] }[];
  incidents: IncidentView[];
  branding: boolean;
}

export interface StatusPageRow {
  id: string; user_id: string; slug: string; title: string; description: string | null; show_branding: number; created_at: number;
}

const RESERVED = new Set(['admin', 'api', 'app', 'dashboard', 'demo', 'login', 'signup', 'status', 'www', 'help', 'support', 'pricing', 'uptimerun']);

/** Lowercase letters, numbers and dashes, 3–40 characters. Returns an error message or null. */
export function slugError(slug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug)) return 'Use 3–40 lowercase letters, numbers or dashes (no dash at the start or end).';
  if (RESERVED.has(slug)) return 'That address is reserved. Please pick another.';
  return null;
}

export function slugify(text: string) {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const timeLabel = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const pct = (v: number | null) => (v == null ? '—' : v >= 100 ? '100%' : `${(Math.floor(v * 100) / 100).toFixed(2)}%`);

export async function loadStatusPage(db: D1Database, page: StatusPageRow, origin: string): Promise<StatusPageData> {
  const now = Date.now();
  const since = now - (STATUS_DAYS - 1) * 86_400_000;
  const firstDay = dayKey(since);

  const { results: monitors } = await db.prepare(
    `SELECT m.id, m.name, m.status FROM status_page_monitors spm JOIN monitors m ON m.id = spm.monitor_id
     WHERE spm.page_id = ? ORDER BY spm.position, m.name`,
  ).bind(page.id).all<{ id: string; name: string; status: string }>();

  const ids = monitors.map((m) => m.id);
  const marks = ids.map(() => '?').join(',');
  const [stats, incidents] = ids.length ? await Promise.all([
    db.prepare(`SELECT monitor_id, day, total, up, sum_ms FROM daily_stats WHERE monitor_id IN (${marks}) AND day >= ?`)
      .bind(...ids, firstDay).all<{ monitor_id: string; day: string; total: number; up: number; sum_ms: number }>(),
    db.prepare(`SELECT i.monitor_id, i.cause, i.started_at, i.resolved_at, m.name FROM incidents i JOIN monitors m ON m.id = i.monitor_id
                WHERE i.monitor_id IN (${marks}) AND i.started_at >= ? ORDER BY i.started_at DESC LIMIT 20`)
      .bind(...ids, since).all<{ monitor_id: string; cause: string; started_at: number; resolved_at: number | null; name: string }>(),
  ]) : [{ results: [] }, { results: [] }];

  const byMonitorDay = new Map<string, { total: number; up: number; sum_ms: number }>();
  for (const s of stats.results) byMonitorDay.set(`${s.monitor_id}|${s.day}`, s);

  let allTotal = 0, allUp = 0, allMs = 0;
  const services: Service[] = monitors.map((m) => {
    let total = 0, up = 0;
    const days: Day[] = Array.from({ length: STATUS_DAYS }, (_, i) => {
      const t = since + i * 86_400_000;
      const s = byMonitorDay.get(`${m.id}|${dayKey(t)}`);
      if (s?.total) { total += s.total; up += s.up; allMs += s.sum_ms; }
      return { date: dayLabel(t), up: s?.total ? (100 * s.up) / s.total : null };
    });
    allTotal += total; allUp += up;
    const status = m.status === 'down' ? 'down' : m.status === 'up' ? 'up' : 'pending';
    return { name: m.name, status, uptime: pct(total ? (100 * up) / total : null), days };
  });

  const down = services.filter((s) => s.status === 'down').length;
  const overall: StatusPageData['overall'] = !services.length
    ? { state: 'empty', label: 'No services yet', note: 'This page has no services added.' }
    : down === 0
      ? { state: 'ok', label: 'All systems operational', note: 'Updated live · checked automatically' }
      : down === services.length
        ? { state: 'major', label: 'Major outage', note: 'We’re aware and working on it.' }
        : { state: 'partial', label: 'Partial outage', note: `${down} of ${services.length} services affected. We’re working on it.` };

  const incidentViews: IncidentView[] = incidents.results.map((i) => {
    const end = i.resolved_at ?? now;
    const updates = [
      ...(i.resolved_at ? [{ status: 'Resolved', time: timeLabel(i.resolved_at), text: `${i.name} is back up and working normally.` }] : []),
      { status: i.resolved_at ? 'Investigating' : 'Ongoing', time: timeLabel(i.started_at), text: `${i.name} is not responding as expected (${i.cause}).` },
    ];
    return {
      date: dayLabel(i.started_at),
      title: `${i.name} ${i.resolved_at ? 'was down' : 'is down'}`,
      impact: monitors.length > 1 ? 'Minor' : 'Major',
      duration: i.resolved_at ? `lasted ${formatDuration(end - i.started_at)}` : `ongoing · ${formatDuration(end - i.started_at)}`,
      updates,
    };
  });

  return {
    title: page.title,
    subtitle: `${new URL(origin).host}/s/${page.slug}`,
    description: page.description,
    overall,
    stats: {
      uptime: pct(allTotal ? (100 * allUp) / allTotal : null),
      avgMs: allUp ? `${Math.round(allMs / allUp)} ms` : '—',
      incidents: incidents.results.length,
    },
    groups: services.length ? [{ services }] : [],
    incidents: incidentViews,
    branding: page.show_branding !== 0,
  };
}
