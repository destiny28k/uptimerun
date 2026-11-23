// Domain + SSL certificate expiry, from free public sources (no API keys):
//  - Domain: RDAP, the official registry lookup (via rdap.org, which forwards to the right registry).
//  - SSL:    Certificate Transparency logs (Cert Spotter, with crt.sh as a backup).
//            Every public certificate is logged, so the newest one for a hostname is the one in use.
import { sendAlerts, type AlertEvent } from './alerts';

const DAY = 86_400_000;
export const EXPIRY_THRESHOLDS = [30, 14, 7, 1]; // days before expiry we alert at
const BATCH = 15;                                 // monitors per cron run (cron runs every minute)

// Common two-part endings, so "shop.example.co.uk" → "example.co.uk".
const TWO_PART = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.in', 'net.in', 'org.in',
  'com.br', 'com.mx', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'com.tr', 'com.sg', 'com.cn', 'com.ar', 'co.id', 'com.my']);

export function registrableDomain(hostname: string) {
  const parts = hostname.toLowerCase().replace(/\.$/, '').split('.');
  const lastTwo = parts.slice(-2).join('.');
  return parts.slice(TWO_PART.has(lastTwo) ? -3 : -2).join('.');
}

async function getJson(url: string, timeoutMs = 20_000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json', 'user-agent': 'UpbeatMonitor/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json<any>();
}

/** Domain expiry date (unix ms), or null if the registry doesn't publish it. */
export async function domainExpiry(hostname: string): Promise<number | null> {
  try {
    const data = await getJson(`https://rdap.org/domain/${registrableDomain(hostname)}`);
    const date = (data.events ?? []).find((e: any) => e.eventAction === 'expiration')?.eventDate;
    return date ? Date.parse(date) : null;
  } catch {
    return null;
  }
}

function coversHost(names: string[], host: string) {
  const parent = host.split('.').slice(1).join('.');
  return names.some((n) => n === host || n === `*.${parent}`);
}

/** Expiry (unix ms) and issuer of the newest certificate for this hostname, or null. */
export async function sslExpiry(hostname: string): Promise<{ expires: number; issuer: string } | null> {
  const now = Date.now();
  // 1) Cert Spotter
  try {
    const list: any[] = await getJson(`https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(hostname)}&expand=dns_names&expand=issuer`);
    const best = list
      .filter((c) => !c.revoked && Date.parse(c.not_after) > now && coversHost(c.dns_names ?? [], hostname))
      .sort((a, b) => Date.parse(b.not_before) - Date.parse(a.not_before))[0];
    if (best) return { expires: Date.parse(best.not_after), issuer: best.issuer?.friendly_name || best.issuer?.name || '' };
  } catch { /* fall through to crt.sh */ }
  // 2) crt.sh backup
  try {
    const list: any[] = await getJson(`https://crt.sh/?q=${encodeURIComponent(hostname)}&output=json&exclude=expired`, 30_000);
    const best = list
      .filter((c) => coversHost(String(c.name_value).split('\n'), hostname))
      .sort((a, b) => Date.parse(b.not_before) - Date.parse(a.not_before))[0];
    if (best) {
      const issuer = /O=([^,]+)/.exec(best.issuer_name)?.[1] ?? '';
      return { expires: Date.parse(best.not_after + 'Z'), issuer };
    }
  } catch { /* unknown */ }
  return null;
}

/** Which thresholds (e.g. "ssl:30") have now been crossed, so we alert once per threshold. */
function crossed(kind: 'ssl' | 'domain', expires: number | null, already: Set<string>) {
  if (!expires) return [];
  const days = Math.ceil((expires - Date.now()) / DAY);
  return EXPIRY_THRESHOLDS.filter((t) => days <= t && !already.has(`${kind}:${t}`)).map((t) => ({ key: `${kind}:${t}`, days }));
}

interface Row {
  id: string; user_id: string; name: string; url: string;
  domain_expires_at: number | null; ssl_expires_at: number | null; expiry_alerted: string;
}

/** Called every minute; refreshes a few monitors whose expiry data is older than a day. */
export async function runExpiryChecks(env: Env) {
  const now = Date.now();
  const { results } = await env.DB.prepare(
    // Expiry alerts are a Pro/Business feature: Free users' monitors are skipped.
    `SELECT m.id, m.user_id, m.name, m.url, m.domain_expires_at, m.ssl_expires_at, m.expiry_alerted
     FROM monitors m JOIN user_plans p ON p.user_id = m.user_id AND p.plan IN ('pro', 'business')
     WHERE m.status != 'paused' AND m.expiry_checked_at < ? ORDER BY m.expiry_checked_at LIMIT ?`,
  ).bind(now - DAY, BATCH).all<Row>();
  if (!results.length) return;

  const alerts: AlertEvent[] = [];
  const stmts: D1PreparedStatement[] = [];

  await Promise.all(results.map(async (m) => {
    const url = new URL(m.url);
    const [domain, ssl] = await Promise.all([
      domainExpiry(url.hostname),
      url.protocol === 'https:' ? sslExpiry(url.hostname) : Promise.resolve(null),
    ]);
    // Keep the old value if a lookup failed this time.
    const domainAt = domain ?? m.domain_expires_at;
    const sslAt = ssl?.expires ?? m.ssl_expires_at;

    // A renewal pushes the date later: forget old alerts for it.
    let alerted = new Set(m.expiry_alerted ? m.expiry_alerted.split(',') : []);
    if (sslAt && m.ssl_expires_at && sslAt > m.ssl_expires_at) alerted = new Set([...alerted].filter((k) => !k.startsWith('ssl:')));
    if (domainAt && m.domain_expires_at && domainAt > m.domain_expires_at) alerted = new Set([...alerted].filter((k) => !k.startsWith('domain:')));

    for (const [kind, at] of [['ssl', sslAt], ['domain', domainAt]] as const) {
      const hits = crossed(kind, at, alerted);
      if (hits.length) {
        hits.forEach((h) => alerted.add(h.key));
        alerts.push({ userId: m.user_id, monitorName: m.name, url: m.url, kind: 'expiry', expiryKind: kind, daysLeft: hits[0].days, expiresAt: at! });
      }
    }

    stmts.push(env.DB.prepare(
      `UPDATE monitors SET domain_expires_at = ?, ssl_expires_at = ?, ssl_issuer = COALESCE(?, ssl_issuer), expiry_checked_at = ?, expiry_alerted = ? WHERE id = ?`,
    ).bind(domainAt, sslAt, ssl?.issuer ?? null, now, [...alerted].join(','), m.id));
  }));

  if (stmts.length) await env.DB.batch(stmts);
  await sendAlerts(env, alerts);
}
