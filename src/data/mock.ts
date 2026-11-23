// UI-only mock data. Replaced by real D1 data later.
export type Status = 'up' | 'down' | 'paused' | 'pending';

export interface Monitor {
  id: string;
  name: string;
  url: string;
  type: 'HTTPS' | 'Keyword' | 'Ping' | 'SSL' | 'Heartbeat';
  status: Status;
  interval: string;
  ms: number;
  uptime: number;
  lastCheck: string;
  history: Status[]; // last 60 checks, oldest first
}

function hist(downAt: number[] = [], last: Status = 'up'): Status[] {
  return Array.from({ length: 60 }, (_, i) => (i === 59 ? last : downAt.includes(i) ? 'down' : 'up'));
}

export const monitors: Monitor[] = [
  { id: 'myshop', name: 'My Shop', url: 'https://myshop.com', type: 'HTTPS', status: 'up', interval: '1 min', ms: 182, uptime: 99.99, lastCheck: '12s ago', history: hist() },
  { id: 'api', name: 'Shop API', url: 'https://api.myshop.com/health', type: 'HTTPS', status: 'up', interval: '1 min', ms: 96, uptime: 99.95, lastCheck: '20s ago', history: hist([41]) },
  { id: 'blog', name: 'Studio Blog', url: 'https://blog.studio.io', type: 'Keyword', status: 'down', interval: '1 min', ms: 0, uptime: 98.71, lastCheck: '5s ago', history: hist([12, 13, 57, 58], 'down') },
  { id: 'client', name: 'Client site (FR)', url: 'https://client-site.fr', type: 'SSL', status: 'up', interval: '5 min', ms: 241, uptime: 100, lastCheck: '1m ago', history: hist() },
  { id: 'cron', name: 'Nightly backup', url: 'heartbeat', type: 'Heartbeat', status: 'up', interval: '24 h', ms: 0, uptime: 99.7, lastCheck: '6h ago', history: hist([30]) },
  { id: 'old', name: 'Old landing page', url: 'https://promo.myshop.com', type: 'HTTPS', status: 'paused', interval: '5 min', ms: 0, uptime: 99.2, lastCheck: '—', history: hist([], 'paused') },
];

export const incidents = [
  { monitor: 'Studio Blog', cause: 'Keyword "Add to cart" not found', started: 'Today, 14:02', duration: 'Ongoing · 3 min', open: true },
  { monitor: 'Shop API', cause: '502 Bad Gateway', started: 'Yesterday, 03:17', duration: '4 min', open: false },
  { monitor: 'Studio Blog', cause: 'Connection timeout (30s)', started: 'Nov 19, 22:41', duration: '11 min', open: false },
  { monitor: 'Nightly backup', cause: 'Heartbeat missed', started: 'Nov 17, 02:00', duration: '1 h 2 min', open: false },
];

// 48 response-time points (ms), for the detail chart.
export const responseTimes = [180, 176, 190, 185, 210, 198, 175, 170, 182, 260, 240, 190, 186, 178, 172, 169, 175, 188, 195, 205, 230, 214, 196, 184, 180, 176, 171, 168, 174, 182, 190, 310, 280, 205, 192, 185, 179, 176, 181, 187, 193, 200, 189, 183, 179, 177, 182, 182];
