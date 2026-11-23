// Sends down/up alerts to each user's channels (email via Resend, Telegram bot).
// Without API keys (local dev), alerts are logged instead of sent.

export interface AlertEvent {
  userId: string;
  monitorName: string;
  url: string;
  kind: 'down' | 'up' | 'test' | 'expiry';
  cause?: string;
  durationMs?: number;
  expiryKind?: 'ssl' | 'domain';
  daysLeft?: number;
  expiresAt?: number;
}

export type ChannelType = 'email' | 'telegram' | 'discord' | 'slack';
interface Channel { user_id: string; type: ChannelType; target: string }

/** Which webhook URLs we accept for chat apps. */
export const WEBHOOK_PATTERNS: Record<'discord' | 'slack', RegExp> = {
  discord: /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/,
  slack: /^https:\/\/hooks\.slack\.com\/services\/[\w/]+$/,
};

export function formatDuration(ms: number) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

function message(e: AlertEvent) {
  if (e.kind === 'expiry') {
    const what = e.expiryKind === 'ssl' ? 'SSL certificate' : 'Domain';
    const date = new Date(e.expiresAt!).toUTCString().slice(5, 16);
    const when = e.daysLeft! <= 0 ? 'has expired' : `expires in ${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'}`;
    const tip = e.expiryKind === 'ssl' ? 'Renew it with your hosting provider before visitors see a security warning.' : 'Renew it with your domain registrar so your site and email keep working.';
    return {
      subject: `⚠️ ${what} for ${e.monitorName} ${when}`,
      text: `${what} for ${e.monitorName} ${when} (${date}).\n\nURL: ${e.url}\n\n${tip}`,
      telegram: `⚠️ <b>${what} ${esc(when)}</b>\n${esc(e.monitorName)} · ${esc(date)}\n${esc(e.url)}`,
    };
  }
  if (e.kind === 'test') {
    return {
      subject: `✅ Test alert for ${e.monitorName}`,
      text: `This is a test alert for ${e.monitorName} (${e.url}).\n\nYour alerts are working. You'll get messages like this when it goes down or comes back up.`,
      telegram: `✅ <b>Test alert</b> for ${esc(e.monitorName)}\nYour alerts are working.`,
    };
  }
  if (e.kind === 'down') {
    return {
      subject: `🔴 ${e.monitorName} is DOWN`,
      text: `${e.monitorName} is down.\n\nURL: ${e.url}\nReason: ${e.cause ?? 'Unknown'}\n\nWe'll let you know when it's back up.`,
      telegram: `🔴 <b>${esc(e.monitorName)} is DOWN</b>\n${esc(e.url)}\nReason: ${esc(e.cause ?? 'Unknown')}`,
    };
  }
  const took = e.durationMs ? ` after ${formatDuration(e.durationMs)}` : '';
  return {
    subject: `✅ ${e.monitorName} is back UP`,
    text: `${e.monitorName} is back up${took}.\n\nURL: ${e.url}`,
    telegram: `✅ <b>${esc(e.monitorName)} is back UP</b>${esc(took)}\n${esc(e.url)}`,
  };
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendEmail(env: Env, to: string, subject: string, text: string) {
  if (!env.RESEND_API_KEY) return console.log(`[alert:email → ${to}] ${subject}\n${text}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
}

export async function sendTelegram(env: Env, chatId: string, html: string) {
  if (!env.TELEGRAM_BOT_TOKEN) return console.log(`[alert:telegram → ${chatId}] ${html}`);
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) console.error('Telegram error', res.status, await res.text());
}

/** Discord and Slack incoming webhooks: plain JSON posts. */
export async function sendWebhook(env: Env, type: 'discord' | 'slack', url: string, text: string) {
  if (!WEBHOOK_PATTERNS[type].test(url)) return console.error(`Rejected ${type} webhook URL`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(type === 'discord' ? { content: text } : { text }),
  }).catch((e) => { console.error(`${type} webhook failed`, e); return null; });
  if (res && !res.ok) console.error(`${type} webhook error`, res.status);
}

export async function sendAlerts(env: Env, events: AlertEvent[]) {
  if (!events.length) return;
  const userIds = [...new Set(events.map((e) => e.userId))];
  const marks = userIds.map(() => '?').join(',');

  const [{ results: channels }, { results: users }] = await Promise.all([
    env.DB.prepare(`SELECT user_id, type, target FROM alert_channels WHERE enabled = 1 AND user_id IN (${marks})`).bind(...userIds).all<Channel>(),
    env.DB.prepare(`SELECT id, email FROM "user" WHERE id IN (${marks})`).bind(...userIds).all<{ id: string; email: string }>(),
  ]);

  const jobs: Promise<unknown>[] = [];
  for (const e of events) {
    const msg = message(e);
    let mine = channels.filter((c) => c.user_id === e.userId);
    // No channels set up yet: fall back to the account email.
    if (!mine.length) {
      const email = users.find((u) => u.id === e.userId)?.email;
      if (email) mine = [{ user_id: e.userId, type: 'email', target: email }];
    }
    for (const c of mine) {
      if (c.type === 'email') jobs.push(sendEmail(env, c.target, msg.subject, msg.text));
      else if (c.type === 'telegram') jobs.push(sendTelegram(env, c.target, msg.telegram));
      else jobs.push(sendWebhook(env, c.type, c.target, `${msg.subject}\n${e.url}${e.cause ? `\nReason: ${e.cause}` : ''}`));
    }
  }
  await Promise.allSettled(jobs);
}
