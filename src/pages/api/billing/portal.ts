import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createAuth } from '../../../lib/auth';
import { portalUrl } from '../../../lib/billing';

// GET /api/billing/portal → Dodo customer portal (card, invoices, cancel).
export const GET: APIRoute = async ({ request, redirect }) => {
  const session = await createAuth(env).api.getSession({ headers: request.headers });
  if (!session) return redirect('/login');
  const row = await env.DB.prepare(`SELECT provider_customer_id FROM user_plans WHERE user_id = ?`).bind(session.user.id).first<{ provider_customer_id: string | null }>();
  if (!row?.provider_customer_id) return redirect('/dashboard/settings');
  try {
    return redirect(await portalUrl(env, row.provider_customer_id), 303);
  } catch (e) {
    console.error(e);
    return redirect('/dashboard/settings?billing=error');
  }
};
