// Dodo Payments (merchant of record): checkout, customer portal and webhooks.
// Env: DODO_API_KEY (secret), DODO_WEBHOOK_SECRET (secret), DODO_MODE ('test' | 'live'),
// DODO_PRODUCTS (JSON: {"pro_monthly":"pdt_…","pro_yearly":"pdt_…","business_monthly":"pdt_…","business_yearly":"pdt_…"}).
import { enforcePlan, type PlanId } from './plans';

type Env = Record<string, any>;
export type Billing = 'monthly' | 'yearly';

const base = (env: Env) => (env.DODO_MODE === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com');
const products = (env: Env): Record<string, string> => { try { return JSON.parse(env.DODO_PRODUCTS || '{}'); } catch { return {}; } };

async function dodo(env: Env, path: string, body?: unknown) {
  const res = await fetch(base(env) + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${env.DODO_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Dodo ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json<any>();
}

export const billingReady = (env: Env) => !!(env.DODO_API_KEY && Object.keys(products(env)).length);

/** Hosted checkout URL for a plan. user_id goes in metadata so the webhook knows who paid. */
export async function createCheckout(env: Env, user: { id: string; email: string; name: string }, plan: 'pro' | 'business', billing: Billing) {
  const productId = products(env)[`${plan}_${billing}`];
  if (!productId) throw new Error(`No Dodo product for ${plan}_${billing}`);
  const r = await dodo(env, '/checkouts', {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: user.email, name: user.name || user.email },
    return_url: `${env.APP_URL}/dashboard/settings?upgraded=1`,
    metadata: { user_id: user.id, plan, billing },
  });
  return r.checkout_url as string;
}

/** Link to Dodo's customer portal (update card, invoices, cancel). */
export async function portalUrl(env: Env, customerId: string) {
  const r = await dodo(env, `/customers/${customerId}/customer-portal/session`, {});
  return r.link as string;
}

/** Verify a Standard Webhooks signature (webhook-id / webhook-timestamp / webhook-signature). */
export async function verifyWebhook(env: Env, req: Request, body: string) {
  const id = req.headers.get('webhook-id'), ts = req.headers.get('webhook-timestamp'), sigs = req.headers.get('webhook-signature');
  if (!id || !ts || !sigs || !env.DODO_WEBHOOK_SECRET) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // replay protection: 5 min
  const secret = Uint8Array.from(atob(String(env.DODO_WEBHOOK_SECRET).replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sigs.split(' ').some((s) => {
    const v = s.split(',')[1] ?? '';
    if (v.length !== expected.length) return false;
    let diff = 0; for (let i = 0; i < v.length; i++) diff |= v.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

/** Apply a subscription webhook to user_plans. */
export async function handleEvent(env: Env, event: { type: string; data: any }) {
  if (!event.type?.startsWith('subscription.')) return;
  const d = event.data ?? {};
  const db: D1Database = env.DB;
  // Find the user: metadata from checkout, else an existing row for this subscription.
  let userId: string | undefined = d.metadata?.user_id;
  if (!userId && d.subscription_id) {
    userId = (await db.prepare(`SELECT user_id FROM user_plans WHERE provider_subscription_id = ?`).bind(d.subscription_id).first<{ user_id: string }>())?.user_id;
  }
  if (!userId) return;
  // Plan from the product (works for plan changes too).
  const entry = Object.entries(products(env)).find(([, pid]) => pid === d.product_id)?.[0];
  const [plan, billing] = (entry ?? `${d.metadata?.plan ?? 'pro'}_${d.metadata?.billing ?? 'monthly'}`).split('_') as [PlanId, Billing];
  const status =
    event.type === 'subscription.active' || event.type === 'subscription.renewed' || event.type === 'subscription.plan_changed' ? 'active'
    : event.type === 'subscription.on_hold' || event.type === 'subscription.failed' ? 'past_due'
    : event.type === 'subscription.cancelled' || event.type === 'subscription.expired' ? 'cancelled'
    : null;
  if (!status) return;
  const periodEnd = d.next_billing_date ? Date.parse(d.next_billing_date) : null;
  // Failed / expired = lose access now; cancelled = keep access until the paid period ends.
  const effectiveEnd = event.type === 'subscription.failed' || event.type === 'subscription.expired' ? Date.now() - 1 : periodEnd;
  await db.prepare(
    `INSERT INTO user_plans (user_id, plan, billing, status, current_period_end, provider_customer_id, provider_subscription_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, billing = excluded.billing, status = excluded.status,
       current_period_end = excluded.current_period_end, provider_customer_id = COALESCE(excluded.provider_customer_id, provider_customer_id),
       provider_subscription_id = excluded.provider_subscription_id, updated_at = excluded.updated_at`,
  ).bind(userId, plan, billing, status, effectiveEnd, d.customer?.customer_id ?? null, d.subscription_id ?? null, Date.now()).run();
  if (status !== 'active') await enforcePlan(db, userId); // no-op while still inside the paid period
}
