// Single source of truth for plans: used by the landing page and /pricing.
export interface Plan {
  id: 'free' | 'pro' | 'business';
  name: string;
  blurb: string;
  monthly: number;     // $ per month, billed monthly
  yearly: number;      // $ per year, billed yearly
  cta: string;
  featured?: boolean;
  highlights: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', monthly: 0, yearly: 0, cta: 'Start free',
    blurb: 'For side projects and small sites.',
    highlights: ['10 monitors', '5-minute checks', 'Email, Telegram, Slack & Discord alerts', '1 status page', '3 months of history', 'Commercial use allowed'],
  },
  {
    id: 'pro', name: 'Pro', monthly: 10, yearly: 96, cta: 'Start 14-day free trial', featured: true,
    blurb: 'For businesses that can’t afford downtime.',
    highlights: ['50 monitors', '1-minute checks', 'SSL & domain expiry alerts', '3 status pages on your own domain', '12 months of history', 'Everything in Free'],
  },
  {
    id: 'business', name: 'Business', monthly: 20, yearly: 192, cta: 'Start 14-day free trial',
    blurb: 'For agencies and teams with many sites.',
    highlights: ['200 monitors', '30-second checks', 'Unlimited status pages, no branding', '3 team members', '24 months of history', 'Everything in Pro'],
  },
];

/** Yearly saving vs paying monthly, as a whole percent. */
export const YEARLY_SAVING = Math.round((1 - PLANS[1].yearly / (PLANS[1].monthly * 12)) * 100);

type Cell = boolean | string;
export interface FeatureGroup { title: string; rows: { label: string; hint?: string; values: [Cell, Cell, Cell] }[] }

export const FEATURES: FeatureGroup[] = [
  {
    title: 'Monitoring',
    rows: [
      { label: 'Monitors', values: ['10', '50', '200'] },
      { label: 'Check interval', values: ['5 min', '1 min', '30 sec'] },
      { label: 'Website (HTTP/HTTPS) checks', values: [true, true, true] },
      { label: 'Keyword checks', hint: 'Make sure a word like “Add to cart” is on the page', values: [true, true, true] },
      { label: 'Confirmed outages', hint: 'We re-check before alerting, so no false alarms', values: [true, true, true] },
      { label: 'Custom timeout, method & redirects', values: [true, true, true] },
      { label: 'SSL certificate expiry alerts', values: [false, true, true] },
      { label: 'Domain expiry alerts', values: [false, true, true] },
      { label: 'History kept', values: ['3 months', '12 months', '24 months'] },
    ],
  },
  {
    title: 'Alerts',
    rows: [
      { label: 'Email', values: [true, true, true] },
      { label: 'Telegram', values: [true, true, true] },
      { label: 'Slack & Discord', values: [true, true, true] },
      { label: 'Test alerts', values: [true, true, true] },
      { label: 'SMS & voice calls', hint: 'Pay-as-you-go credits', values: ['Soon', 'Soon', 'Soon'] },
    ],
  },
  {
    title: 'Status pages',
    rows: [
      { label: 'Public status pages', values: ['1', '3', 'Unlimited'] },
      { label: 'Use your own domain', values: [false, true, true] },
      { label: 'Remove our branding', values: [false, false, true] },
    ],
  },
  {
    title: 'Account',
    rows: [
      { label: 'Team members', values: ['1', '1', '3'] },
      { label: 'Commercial use', values: [true, true, true] },
      { label: 'Google & email login', values: [true, true, true] },
      { label: 'Support', values: ['Email', 'Email', 'Priority'] },
    ],
  },
];
