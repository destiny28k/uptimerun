import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createAuth } from '../../../lib/auth';
import { createCheckout, billingReady } from '../../../lib/billing';

// GET /api/billing/checkout?plan=pro&billing=yearly → redirects to Dodo's hosted checkout.
export const GET: APIRoute = async ({ request, url, redirect }) => {
  const session = await createAuth(env).api.getSession({ headers: request.headers });
  if (!session) return redirect('/signup');
  const plan = url.searchParams.get('plan'), billing = url.searchParams.get('billing');
  if ((plan !== 'pro' && plan !== 'business') || (billing !== 'monthly' && billing !== 'yearly')) return redirect('/dashboard/settings');
  if (!billingReady(env)) return redirect('/dashboard/settings?billing=soon');
  try {
    const { id, email, name } = session.user;
    return redirect(await createCheckout(env, { id, email, name }, plan, billing), 303);
  } catch (e) {
    console.error(e);
    return redirect('/dashboard/settings?billing=error');
  }
};
