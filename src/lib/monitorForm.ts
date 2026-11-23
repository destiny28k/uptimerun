// Shared parsing + validation for the New and Edit monitor forms.
import { INTERVALS } from './data';

export const TIMEOUTS = [5, 15, 30, 45, 60];

export interface MonitorValues {
  type: string;
  url: string;
  name: string;
  keyword: string;
  interval: string;
  timeout: string;
  method: string;
  follow: string; // '1' | '0'
}

export const DEFAULT_VALUES: MonitorValues = {
  type: 'http', url: '', name: '', keyword: '', interval: '300', timeout: '30', method: 'HEAD', follow: '1',
};

export interface CleanMonitor {
  name: string;
  url: string;
  type: 'http' | 'keyword';
  keyword: string | null;
  interval_sec: number;
  timeout_sec: number;
  method: 'HEAD' | 'GET';
  follow_redirects: number;
}

export function readForm(f: FormData): MonitorValues {
  const v = (k: string, d = '') => String(f.get(k) ?? d).trim();
  return {
    type: v('type', 'http'), url: v('url'), name: v('name'), keyword: v('keyword'),
    interval: v('interval', '300'), timeout: v('timeout', '30'), method: v('method', 'HEAD'),
    follow: f.get('follow') ? '1' : '0',
  };
}

/** Returns a clean monitor, or an error message for the form. */
export function validate(values: MonitorValues, minIntervalSec = 0): { data?: CleanMonitor; error?: string } {
  let url = values.url;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch {}

  const interval = Number(values.interval);
  const timeout = Number(values.timeout);
  if (!parsed || !/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes('.')) return { error: 'Please enter a valid website address, like https://yourwebsite.com' };
  if (values.type === 'keyword' && !values.keyword) return { error: 'Enter the keyword we should look for on the page.' };
  if (!INTERVALS.some((i) => i.sec === interval)) return { error: 'Please choose a check interval.' };
  if (interval < minIntervalSec) return { error: 'That check interval needs a higher plan. Choose a slower one, or upgrade.' };
  if (!TIMEOUTS.includes(timeout)) return { error: 'Please choose a request timeout.' };

  const isKeyword = values.type === 'keyword';
  return {
    data: {
      name: (values.name || parsed.hostname.replace(/^www\./, '')).slice(0, 60),
      url: parsed.toString(),
      type: isKeyword ? 'keyword' : 'http',
      keyword: isKeyword ? values.keyword.slice(0, 100) : null,
      interval_sec: interval,
      timeout_sec: timeout,
      method: values.method === 'GET' ? 'GET' : 'HEAD',
      follow_redirects: values.follow === '0' ? 0 : 1,
    },
  };
}
