// Worker entry: Astro handles web requests, scheduled() runs every minute.
import { handle } from '@astrojs/cloudflare/handler';
import { runChecks } from './lib/checker';
import { runExpiryChecks } from './lib/expiry';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default {
  fetch: handle,
  async scheduled(_controller, env, ctx) {
    // Uptime checks: once now, and again 30 seconds later for 30-second (Business) monitors.
    // Monitors on slower intervals aren't due yet at the second pass, so they're skipped.
    ctx.waitUntil((async () => {
      await runChecks(env);
      await sleep(30_000);
      await runChecks(env);
    })());
    ctx.waitUntil(runExpiryChecks(env)); // domain + SSL expiry, each monitor once a day
  },
} satisfies ExportedHandler<Env>;
