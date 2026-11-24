// Free public checker tools (/tools/*): input parsing, rate limiting and the checks themselves.
import { isPrivateHost } from './monitorForm';
import { domainExpiry, registrableDomain, sslExpiry } from './expiry';

export type ToolId = 'down' | 'ssl' | 'domain' | 'status';
type Tone = 'good' | 'bad' | 'warn' | undefined;

export interface ToolResult {
  url: string;                                   // normalized address that was checked (used for the signup CTA)
  summary: { tone: 'good' | 'bad' | 'warn'; text: string };
  rows: [string, string, Tone?][];
  chain?: { url: string; status: number; ms: number }[];
}

const DAY = 86_400_000;
const UA = 'UptimeRunBot/1.0 (+https://uptimerun.com/tools)';

/** Turn what the visitor typed into a public http(s) URL, or an error message. */
export function parseTarget(input: string): { url?: URL; error?: string } {
  let raw = input.trim();
  if (!raw) return { error: 'Enter a website address, like example.com' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try { url = new URL(raw); } catch { return { error: 'That doesn’t look like a valid website address.' }; }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.') || raw.length > 500) return { error: 'That doesn’t look like a valid website address.' };
  if (isPrivateHost(url.hostname)) return { error: 'Private and internal addresses can’t be checked. Please use a public website.' };
  return { url };
}

// Simple per-IP limiter. Memory lives per Worker isolate, which is enough to stop casual abuse.
const WINDOW = 60_000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + WINDOW }); return false; }
  h.n++;
  return h.n > MAX_PER_WINDOW;
}

const fmtDate = (ms: number) => new Date(ms).toUTCString().slice(5, 16);
const daysLeft = (ms: number) => Math.ceil((ms - Date.now()) / DAY);

/** Request a URL hop by hop (max 10 redirects), recording each status. Never follows into private hosts. */
async function followChain(start: URL) {
  const chain: { url: string; status: number; ms: number }[] = [];
  let url = start;
  for (let i = 0; i <= 10; i++) {
    const t = Date.now();
    const res = await fetch(url.toString(), {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: { 'user-agent': UA },
    });
    await res.body?.cancel();
    chain.push({ url: url.toString(), status: res.status, ms: Date.now() - t });
    const loc = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !loc) return { chain, error: '' };
    let next: URL;
    try { next = new URL(loc, url); } catch { return { chain, error: 'Invalid redirect address' }; }
    if (!/^https?:$/.test(next.protocol) || isPrivateHost(next.hostname)) return { chain, error: 'Redirects to a private address (not followed)' };
    url = next;
  }
  return { chain, error: 'Too many redirects (more than 10)' };
}

function connError(err: unknown) {
  return (err as Error)?.name === 'TimeoutError' ? 'No response within 15 seconds (timeout)' : 'Could not connect (DNS, TLS or network error)';
}

export async function runTool(tool: ToolId, url: URL): Promise<ToolResult> {
  const base = { url: url.toString() };

  if (tool === 'down' || tool === 'status') {
    const start = Date.now();
    let res;
    try { res = await followChain(url); } catch (err) {
      return { ...base, summary: { tone: 'bad', text: `${url.hostname} looks down: ${connError(err)}.` }, rows: [['Status', 'No response', 'bad'], ['Checked URL', url.toString()]] };
    }
    const { chain, error } = res;
    const last = chain[chain.length - 1];
    const total = Date.now() - start;
    const up = !error && last.status < 400;
    const statusTone: Tone = last.status < 300 ? 'good' : last.status < 400 ? 'warn' : 'bad';

    if (tool === 'down') {
      return {
        ...base,
        summary: up
          ? { tone: 'good', text: `${url.hostname} is up and responding normally.` }
          : { tone: 'bad', text: error ? `${url.hostname} has a problem: ${error}.` : `${url.hostname} is responding with an error (HTTP ${last.status}).` },
        rows: [
          ['Status code', `${last.status} ${statusText(last.status)}`, statusTone],
          ['Response time', `${total} ms`, total > 3000 ? 'warn' : 'good'],
          ['Final URL', last.url],
          ['Redirects', String(chain.length - 1)],
        ],
      };
    }
    return {
      ...base,
      summary: error
        ? { tone: 'bad', text: error }
        : { tone: statusTone === 'good' ? 'good' : statusTone ?? 'warn', text: chain.length > 1 ? `${chain.length - 1} redirect${chain.length > 2 ? 's' : ''}, ending in HTTP ${last.status} ${statusText(last.status)}.` : `HTTP ${last.status} ${statusText(last.status)}, no redirects.` },
      rows: [
        ['Final status', `${last.status} ${statusText(last.status)}`, statusTone],
        ['Redirect hops', String(chain.length - 1), chain.length > 3 ? 'warn' : undefined],
        ['Final URL', last.url],
        ['Total time', `${total} ms`],
      ],
      chain,
    };
  }

  if (tool === 'ssl') {
    const cert = await sslExpiry(url.hostname);
    if (!cert) return { ...base, summary: { tone: 'warn', text: `No valid public certificate found for ${url.hostname}.` }, rows: [['Hostname', url.hostname], ['Certificate', 'Not found', 'bad']] };
    const d = daysLeft(cert.expires);
    const tone = d <= 7 ? 'bad' : d <= 30 ? 'warn' : 'good';
    return {
      ...base,
      summary: { tone, text: `The SSL certificate for ${url.hostname} expires in ${d} day${d === 1 ? '' : 's'}.` },
      rows: [
        ['Hostname', url.hostname],
        ['Expires', fmtDate(cert.expires), tone],
        ['Days left', String(d), tone],
        ['Issuer', cert.issuer || 'Unknown'],
      ],
    };
  }

  // domain
  const domain = registrableDomain(url.hostname);
  const expires = await domainExpiry(url.hostname);
  if (!expires) return { ...base, summary: { tone: 'warn', text: `The registry for ${domain} doesn’t publish an expiry date (common for some country domains).` }, rows: [['Domain', domain], ['Expiry date', 'Not published']] };
  const d = daysLeft(expires);
  const tone = d <= 14 ? 'bad' : d <= 60 ? 'warn' : 'good';
  return {
    ...base,
    summary: { tone, text: d < 0 ? `${domain} expired ${-d} days ago.` : `${domain} expires in ${d} day${d === 1 ? '' : 's'}.` },
    rows: [['Domain', domain], ['Expires', fmtDate(expires), tone], ['Days left', String(d), tone]],
  };
}

function statusText(code: number) {
  const t: Record<number, string> = {
    200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified',
    307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
    405: 'Method Not Allowed', 408: 'Request Timeout', 410: 'Gone', 429: 'Too Many Requests', 500: 'Internal Server Error',
    502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout', 520: 'Unknown Error', 521: 'Web Server Is Down',
    522: 'Connection Timed Out', 523: 'Origin Unreachable', 524: 'A Timeout Occurred', 525: 'SSL Handshake Failed', 526: 'Invalid SSL Certificate',
  };
  return t[code] ?? '';
}
