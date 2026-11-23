import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyWebhook, handleEvent } from '../../../lib/billing';

// POST /api/billing/webhook ← Dodo Payments. Signature-verified; idempotent upserts.
export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  if (!(await verifyWebhook(env, request, body))) return new Response('invalid signature', { status: 401 });
  try {
    await handleEvent(env, JSON.parse(body));
  } catch (e) {
    console.error('webhook', e);
    return new Response('error', { status: 500 }); // Dodo retries
  }
  return new Response('ok');
};
