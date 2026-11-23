// Worker entry: Astro handles web requests, scheduled() runs every minute.
import { handle } from '@astrojs/cloudflare/handler';
import { runChecks } from './lib/checker';
import { runExpiryChecks } from './lib/expiry';

export default {
  fetch: handle,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runChecks(env));        // uptime checks
    ctx.waitUntil(runExpiryChecks(env));  // domain + SSL expiry, each monitor once a day
  },
} satisfies ExportedHandler<Env>;
