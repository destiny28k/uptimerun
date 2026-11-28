// Comparison pages (/compare/*). Competitor prices were checked on each vendor's public
// pricing page in November 2026 (USD, billed yearly unless noted). Re-check before editing.
export const PRICES_CHECKED = 'November 2026';

export interface Competitor {
  slug: string;
  name: string;
  title: string;        // <title>, ≤ 60 chars
  description: string;  // meta, ≤ 155 chars
  heading: string;
  lead: string;
  verdict: string;      // one-paragraph answer up top
  rows: [string, string, string][]; // [feature, UptimeRun, competitor]
  theyWin: string[];
  weWin: string[];
  pickThem: string;
  faqs: [string, string][];
  // For the /compare hub table
  free: string;
  entry: string;
}

export const COMPETITORS: Competitor[] = [
  {
    slug: 'uptimerobot-alternative',
    name: 'UptimeRobot',
    title: 'UptimeRobot Alternative: UptimeRun vs UptimeRobot (2026)',
    description: 'Looking for a cheaper UptimeRobot alternative? Compare UptimeRun vs UptimeRobot on price, check intervals, free plan, alerts and status pages.',
    heading: 'UptimeRun vs UptimeRobot',
    lead: 'An honest comparison for anyone looking for a cheaper UptimeRobot alternative: where each one wins, and what you actually pay.',
    verdict: 'UptimeRobot’s free plan gives you more monitors (50 vs our 10) and more monitor types. UptimeRun is cheaper once you pay: 50 monitors with 1-minute checks cost $8/month, and 200 monitors with 30-second checks cost $16/month. Slack and Telegram alerts are free on every UptimeRun plan.',
    rows: [
      ['Free plan', '10 monitors, 5-minute checks', '50 monitors, 5-minute checks'],
      ['Free plan alert channels', 'Email, Telegram, Slack, Discord', 'Email + 5 integrations (Discord, Google Chat and others). Slack and Telegram need a paid plan'],
      ['Commercial use on free plan', 'Yes', 'Yes'],
      ['1-minute checks', '$8/mo for 50 monitors (Pro)', '$9/mo for 10 monitors (Solo). The 50-monitor Solo tier costs about twice as much'],
      ['30-second checks', '$16/mo for 200 monitors (Business)', '$30/mo for 100 monitors (Team)'],
      ['Fastest check interval', '30 seconds', '15 seconds (Scale, from $55/mo)'],
      ['SSL & domain expiry alerts', 'Paid plans, from $8/mo', 'Paid plans, from $9/mo'],
      ['Status pages', '1 free; 3 on your own domain (Pro); unlimited, no branding (Business)', '1 basic free; 3 on your own domain (Solo); white-label from Team'],
      ['Monitor types', 'Website (HTTP/HTTPS) and keyword', 'HTTP, keyword, ping, port, API, UDP, DNS, heartbeat'],
      ['SMS & voice alerts', 'Coming soon', 'Credits (some included on paid plans)'],
      ['Mobile app', 'No (web dashboard)', 'iOS and Android'],
      ['Money-back guarantee', '14 days', '14 days'],
    ],
    theyWin: [
      'More free monitors: 50 on the free plan, against our 10.',
      'More monitor types: ping, port, API, UDP, DNS and heartbeat (cron job) monitoring.',
      'Faster 15-second checks on the Scale plan, plus SMS and voice call alerts.',
      'Mobile apps, multi-location checks and a long track record.',
    ],
    weWin: [
      'Lower paid prices: 50 monitors at 1-minute checks for $8/month (yearly) on Pro.',
      '30-second checks for $16/month with 200 monitors, about half the price of UptimeRobot Team.',
      'Telegram, Slack and Discord alerts on every plan, including Free.',
      'A simple setup: paste a URL and you’re monitoring in about 30 seconds.',
    ],
    pickThem: 'Pick UptimeRobot if you need more than 10 free monitors, or ping, port, API or heartbeat checks. Pick UptimeRun if you mainly monitor websites, want 1-minute or 30-second checks for less, and want Slack or Telegram alerts without paying.',
    faqs: [
      ['Is UptimeRun a good free alternative to UptimeRobot?', 'For a handful of websites, yes. The free plan covers 10 monitors with 5-minute checks, commercial use, a status page and alerts by email, Telegram, Slack or Discord. If you need more than 10 free monitors, UptimeRobot’s free plan has 50.'],
      ['Is UptimeRun cheaper than UptimeRobot?', 'On paid plans, yes. UptimeRun Pro is $8/month (billed yearly) for 50 monitors with 1-minute checks, while UptimeRobot Solo is $9/month for 10 monitors. For 30-second checks, UptimeRun Business is $16/month for 200 monitors, against $30/month for 100 monitors on UptimeRobot Team.'],
      ['Can I move my monitors from UptimeRobot?', 'Yes. Add each website address in UptimeRun, which takes a few seconds per site, then pick your alert channels. You can run both side by side for a while before switching off the old one.'],
      ['Does UptimeRun support ping, port or heartbeat monitoring?', 'Not yet. UptimeRun focuses on website monitoring: HTTP/HTTPS checks, keyword checks, response times, SSL and domain expiry. If you need ping, port or cron job monitoring today, UptimeRobot covers those.'],
    ],
    free: '50 monitors, 5 min',
    entry: '$9/mo for 10 monitors, 1 min',
  },
  {
    slug: 'better-stack-alternative',
    name: 'Better Stack',
    title: 'Better Stack Alternative: UptimeRun vs Better Stack (2026)',
    description: 'Compare UptimeRun vs Better Stack (Better Uptime) for uptime monitoring: free plans, real monthly cost for 50 or 200 monitors, alerts and status pages.',
    heading: 'UptimeRun vs Better Stack',
    lead: 'Better Stack (formerly Better Uptime) is a full observability and on-call platform. If you only need uptime monitoring, here’s how the price compares.',
    verdict: 'Better Stack is the stronger pick if you need on-call scheduling, phone call alerts, incident management or logs. For plain website uptime monitoring, UptimeRun costs far less: $8/month for 50 monitors, against about $50/month on Better Stack for a similar number.',
    rows: [
      ['Free plan', '10 monitors, 5-minute checks, commercial use allowed', '10 monitors & heartbeats, 1 status page (“free for personal projects”)'],
      ['Free plan alert channels', 'Email, Telegram, Slack, Discord', 'Email and Slack'],
      ['Paid entry price', '$8/mo for 50 monitors, 1-minute checks', '$29/mo per responder license, 10 monitors included'],
      ['About 50 monitors', '$8/mo (Pro)', 'About $50/mo (responder + 50-monitor pack at $21/mo)'],
      ['About 200 monitors, 30-second checks', '$16/mo (Business)', 'About $113/mo (responder + four 50-monitor packs)'],
      ['Fastest check interval', '30 seconds', '30 seconds'],
      ['Phone call & SMS alerts', 'Coming soon', 'Unlimited with a responder license'],
      ['On-call scheduling & incident management', 'No', 'Yes'],
      ['Status pages', '1 free; own domain on Pro; no branding on Business', '1 included; extra pages $12/mo; white-label $208 per page/mo'],
      ['Logs, metrics, error tracking', 'No', 'Yes'],
      ['Money-back guarantee', '14 days', '60 days'],
    ],
    theyWin: [
      'On-call schedules, escalations and unlimited phone call and SMS alerts.',
      'A whole observability suite: logs, metrics, traces, error tracking.',
      'Heartbeat, port, Playwright transaction checks and screenshots of errors.',
      'A longer 60-day money-back guarantee.',
    ],
    weWin: [
      'A much lower price for website monitoring: 50 monitors for $8/month instead of about $50.',
      'Commercial use allowed on the free plan.',
      'Telegram and Discord alerts free on every plan.',
      'Status pages on your own domain, and without branding on Business, at no extra per-page cost.',
    ],
    pickThem: 'Pick Better Stack if your team needs on-call rotation, phone alerts and logs in one place. Pick UptimeRun if you want reliable website uptime alerts and status pages without paying per responder.',
    faqs: [
      ['Is Better Stack the same as Better Uptime?', 'Yes. Better Uptime is now part of Better Stack, which combines uptime monitoring with on-call, incident management, logs and other observability tools.'],
      ['Is UptimeRun cheaper than Better Stack?', 'For uptime monitoring, yes. Better Stack paid plans start at $29/month per responder with 10 monitors, and extra monitors cost $21/month per 50 (billed yearly). UptimeRun Pro is $8/month for 50 monitors and Business is $16/month for 200.'],
      ['Can I use UptimeRun’s free plan for a business?', 'Yes. Commercial use is allowed on every UptimeRun plan, including Free. Better Stack describes its free plan as for personal projects.'],
      ['Does UptimeRun have on-call scheduling?', 'No. UptimeRun sends alerts by email, Telegram, Slack and Discord to everyone you add. For rotating on-call schedules with phone escalation, Better Stack is the better fit.'],
    ],
    free: '10 monitors (personal projects)',
    entry: '$29/mo per responder, 10 monitors',
  },
  {
    slug: 'pingdom-alternative',
    name: 'Pingdom',
    title: 'Pingdom Alternative: UptimeRun vs Pingdom Pricing (2026)',
    description: 'A cheaper Pingdom alternative with a free plan. Compare UptimeRun vs Pingdom on monthly price for 10, 50 and 200 checks, alerts and status pages.',
    heading: 'UptimeRun vs Pingdom',
    lead: 'Pingdom is a long-established monitoring tool from SolarWinds with no free plan. Here’s how it compares for straightforward website uptime monitoring.',
    verdict: 'Pingdom adds transaction checks, page speed tests and real user monitoring, which UptimeRun doesn’t offer. For website uptime alone, UptimeRun is free for 10 sites and $8/month for 50, while Pingdom starts at $16.50/month for 10 uptime checks.',
    rows: [
      ['Free plan', '10 monitors, free forever', 'No (free trial only)'],
      ['10 uptime checks', '$0 (Free)', '$16.50/mo'],
      ['50 uptime checks', '$8/mo (Pro)', 'About $71.50/mo ($858/yr)'],
      ['200 uptime checks', '$16/mo (Business, 30-second checks)', 'About $265/mo ($3,182/yr)'],
      ['Alert channels', 'Email, Telegram, Slack, Discord on every plan', 'Email, SMS credits and integrations'],
      ['Transaction & page speed monitoring', 'No', 'Yes'],
      ['Real user monitoring (RUM)', 'No', 'Yes, sold separately from $16.50/mo'],
      ['Public status pages', '1 free; own domain on Pro', 'Yes'],
    ],
    theyWin: [
      'Transaction monitoring that clicks through checkout or login flows.',
      'Page speed monitoring and real user monitoring (sold separately).',
      'SMS alert credits included and many probe locations.',
      'A long-established product from SolarWinds with enterprise options.',
    ],
    weWin: [
      'A free plan: 10 websites monitored for $0, commercial use allowed.',
      'Far lower prices at every size: 50 monitors for $8/month and 200 for $16/month.',
      'Telegram, Slack and Discord alerts included on every plan.',
      'SSL and domain expiry reminders 30, 14, 7 and 1 day ahead on paid plans.',
    ],
    pickThem: 'Pick Pingdom if you need transaction checks, page speed tests or real user monitoring. Pick UptimeRun if you want simple, affordable website uptime and SSL/domain alerts with a status page.',
    faqs: [
      ['Does Pingdom have a free plan?', 'No. Pingdom offers a free trial, then Synthetic Monitoring starts at $16.50/month (billed yearly) for 10 uptime checks. UptimeRun’s free plan monitors 10 websites at no cost, permanently.'],
      ['Is UptimeRun a good Pingdom alternative?', 'Yes, if you mainly need to know when your websites go down. UptimeRun checks every 5 minutes on Free, every minute on Pro and every 30 seconds on Business. If you need transaction or page speed monitoring, Pingdom still offers more.'],
      ['How much does Pingdom cost for 50 websites?', 'About $858 per year for 50 uptime checks (roughly $71.50/month), based on Pingdom’s pricing page. UptimeRun Pro covers 50 monitors for $96 per year.'],
    ],
    free: 'No free plan (trial)',
    entry: '$16.50/mo for 10 checks',
  },
];
