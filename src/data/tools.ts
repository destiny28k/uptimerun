// The free checker tools, used by the /tools index and the "More free tools" links.
export const TOOLS = [
  { id: 'down', slug: 'website-down-checker', name: 'Website Down Checker', blurb: 'Is a website down for everyone or just you? Get the status code, response time and final URL.' },
  { id: 'ssl', slug: 'ssl-checker', name: 'SSL Certificate Checker', blurb: 'See when a site’s SSL certificate expires, who issued it and how many days are left.' },
  { id: 'domain', slug: 'domain-expiry-checker', name: 'Domain Expiry Checker', blurb: 'Look up a domain’s registration expiry date from the official registry (RDAP).' },
  { id: 'status', slug: 'http-status-checker', name: 'HTTP Status & Redirect Checker', blurb: 'Check a URL’s HTTP status code and trace every redirect hop to the final page.' },
] as const;

export type ToolSlug = (typeof TOOLS)[number]['slug'];
