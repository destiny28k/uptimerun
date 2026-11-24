// GET /api/tools/check?tool=down|ssl|domain|status&url=example.com → JSON for the free /tools pages.
import type { APIRoute } from 'astro';
import { parseTarget, rateLimited, runTool, type ToolId } from '../../../lib/tools';

const TOOLS: ToolId[] = ['down', 'ssl', 'domain', 'status'];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const GET: APIRoute = async ({ request, url }) => {
  const tool = url.searchParams.get('tool') as ToolId;
  if (!TOOLS.includes(tool)) return json({ error: 'Unknown tool.' }, 400);

  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  if (rateLimited(ip)) return json({ error: 'Too many checks. Please wait a minute and try again.' }, 429);

  const { url: target, error } = parseTarget(url.searchParams.get('url') ?? '');
  if (!target) return json({ error }, 400);

  try {
    return json(await runTool(tool, target));
  } catch (e) {
    console.error('tool check failed', tool, e);
    return json({ error: 'The check failed. Please try again.' }, 500);
  }
};
