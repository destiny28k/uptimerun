import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { createAuth } from './lib/auth';
import { getPlan } from './lib/plans';

const PROTECTED = /^\/dashboard(\/|$)/;
const GUEST_ONLY = /^\/(login|signup)\/?$/;

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  ctx.locals.plan = null;
  const path = ctx.url.pathname;

  // Only look up the session where it matters (dashboard and auth pages).
  if (PROTECTED.test(path) || GUEST_ONLY.test(path)) {
    const session = await createAuth(env).api.getSession({ headers: ctx.request.headers });
    if (session) {
      const { id, name, email } = session.user;
      ctx.locals.user = { id, name, email };
    }
    if (PROTECTED.test(path) && !ctx.locals.user) return ctx.redirect('/login');
    if (PROTECTED.test(path)) ctx.locals.plan = await getPlan(env.DB, ctx.locals.user!.id);
    if (GUEST_ONLY.test(path) && ctx.locals.user) return ctx.redirect('/dashboard');
  }
  const res = await next();
  // Keep private areas and any non-canonical host (e.g. *.workers.dev) out of search results.
  if (/^\/(dashboard|api|login|signup)(\/|$)/.test(path) || !/(^|\.)uptimerun\.com$|^localhost$/.test(ctx.url.hostname)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
});
