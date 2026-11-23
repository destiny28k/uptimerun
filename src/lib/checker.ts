// The every-minute uptime checker. Called from the Worker's scheduled() handler.
import { sendAlerts, type AlertEvent } from './alerts';

export interface MonitorRow {
  id: string;
  user_id: string;
  name: string;
  url: string;
  type: 'http' | 'keyword';
  keyword: string | null;
  interval_sec: number;
  timeout_sec: number;
  method: 'HEAD' | 'GET';
  follow_redirects: number;
  status: 'pending' | 'up' | 'down' | 'paused';
  fail_count: number;
  history: string;
  ms_history: string;
  status_since: number | null;
}

const BATCH = 400;            // monitors per run (stays under the subrequest limit)
const CONFIRM_FAILS = 2;      // consecutive failures before we call it down
const KEEP = 60;              // results kept in history strings

interface Result { ok: boolean; ms: number; error?: string }

type CheckInput = Pick<MonitorRow, 'url' | 'type' | 'keyword'> & Partial<Pick<MonitorRow, 'timeout_sec' | 'method' | 'follow_redirects'>>;

export async function checkUrl(m: CheckInput): Promise<Result> {
  const start = Date.now();
  const timeout = m.timeout_sec ?? 30;
  const signal = AbortSignal.timeout(timeout * 1000);
  const request = (method: string) => fetch(m.url, {
    method,
    redirect: m.follow_redirects === 0 ? 'manual' : 'follow',
    signal,
    headers: { 'user-agent': 'UpbeatMonitor/1.0 (uptime check)' },
  });
  try {
    // Keyword checks need the page body; otherwise HEAD is lighter.
    const method = m.type === 'keyword' ? 'GET' : (m.method ?? 'HEAD');
    let res = await request(method);
    // Some servers don't support HEAD; retry with GET instead of reporting a false outage.
    if (method === 'HEAD' && (res.status === 405 || res.status === 501)) res = await request('GET');
    const ms = Date.now() - start;
    if (res.status >= 400) {
      await res.body?.cancel();
      return { ok: false, ms, error: `HTTP ${res.status}` };
    }
    if (m.type === 'keyword' && m.keyword) {
      const text = await res.text();
      if (!text.includes(m.keyword)) return { ok: false, ms, error: `Keyword "${m.keyword}" not found` };
    } else {
      await res.body?.cancel();
    }
    return { ok: true, ms };
  } catch (err) {
    const name = (err as Error)?.name;
    return { ok: false, ms: Date.now() - start, error: name === 'TimeoutError' ? `Timeout (${timeout}s)` : 'Connection failed' };
  }
}

function push(list: string, item: string, sep = '') {
  const parts = sep ? (list ? list.split(sep) : []) : list.split('');
  parts.push(item);
  return parts.slice(-KEEP).join(sep);
}

export async function runChecks(env: Env) {
  const now = Date.now();
  const { results: due } = await env.DB.prepare(
    `SELECT id, user_id, name, url, type, keyword, interval_sec, timeout_sec, method, follow_redirects, status, fail_count, history, ms_history, status_since
     FROM monitors WHERE status != 'paused' AND next_check_at <= ? ORDER BY next_check_at LIMIT ?`,
  ).bind(now, BATCH).all<MonitorRow>();
  if (!due.length) return;

  const outcomes = await Promise.all(due.map((m) => checkUrl(m)));
  const day = new Date(now).toISOString().slice(0, 10);
  const stmts: D1PreparedStatement[] = [];
  const alerts: AlertEvent[] = [];

  due.forEach((m, i) => {
    const r = outcomes[i];
    let status = m.status;
    let failCount = r.ok ? 0 : m.fail_count + 1;
    let since = m.status_since ?? now;
    // Re-check failures after a minute so outages are confirmed quickly.
    let next = now + (r.ok ? m.interval_sec * 1000 : Math.min(60_000, m.interval_sec * 1000)) - 10_000;

    if (r.ok) {
      if (m.status !== 'up') {
        if (m.status === 'down') {
          stmts.push(env.DB.prepare(`UPDATE incidents SET resolved_at = ? WHERE monitor_id = ? AND resolved_at IS NULL`).bind(now, m.id));
          alerts.push({ userId: m.user_id, monitorName: m.name, url: m.url, kind: 'up', durationMs: now - since });
        }
        status = 'up';
        since = now;
      }
    } else if (failCount >= CONFIRM_FAILS && m.status !== 'down') {
      status = 'down';
      since = now;
      stmts.push(env.DB.prepare(`INSERT INTO incidents (id, monitor_id, user_id, cause, started_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), m.id, m.user_id, r.error ?? 'Unknown', now));
      alerts.push({ userId: m.user_id, monitorName: m.name, url: m.url, kind: 'down', cause: r.error });
    }

    stmts.push(env.DB.prepare(
      `UPDATE monitors SET status = ?, fail_count = ?, last_ms = ?, last_error = ?, last_checked_at = ?, next_check_at = ?,
       history = ?, ms_history = ?, status_since = ? WHERE id = ?`,
    ).bind(status, failCount, r.ok ? r.ms : null, r.error ?? null, now, next,
      push(m.history, r.ok ? 'u' : 'd'), push(m.ms_history, String(r.ok ? r.ms : 0), ','), since, m.id));

    stmts.push(env.DB.prepare(
      `INSERT INTO daily_stats (monitor_id, day, total, up, sum_ms) VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(monitor_id, day) DO UPDATE SET total = total + 1, up = up + excluded.up, sum_ms = sum_ms + excluded.sum_ms`,
    ).bind(m.id, day, r.ok ? 1 : 0, r.ok ? r.ms : 0));
  });

  await env.DB.batch(stmts);
  await sendAlerts(env, alerts);
}
