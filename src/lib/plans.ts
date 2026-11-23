// What each plan allows. Keep in sync with the pricing page (src/data/plans.ts).
export type PlanId = 'free' | 'pro' | 'business';

export interface PlanLimits {
  name: string;
  monitors: number;
  minIntervalSec: number;   // fastest check allowed
  statusPages: number;
  expiryChecks: boolean;    // SSL + domain expiry alerts
  removeBranding: boolean;  // hide "Powered by" on status pages
}

export const LIMITS: Record<PlanId, PlanLimits> = {
  free: { name: 'Free', monitors: 10, minIntervalSec: 300, statusPages: 1, expiryChecks: false, removeBranding: false },
  pro: { name: 'Pro', monitors: 50, minIntervalSec: 60, statusPages: 3, expiryChecks: true, removeBranding: false },
  business: { name: 'Business', monitors: 200, minIntervalSec: 30, statusPages: 1000, expiryChecks: true, removeBranding: true },
};

/** Lowest plan that allows a given check interval, for "upgrade" badges. */
export function planForInterval(sec: number): PlanId {
  return sec >= LIMITS.free.minIntervalSec ? 'free' : sec >= LIMITS.pro.minIntervalSec ? 'pro' : 'business';
}

/** The user's current plan. Past-due or cancelled subscriptions fall back to Free once the paid period ends. */
export async function getPlan(db: D1Database, userId: string): Promise<{ id: PlanId; limits: PlanLimits }> {
  const row = await db.prepare(`SELECT plan, status, current_period_end FROM user_plans WHERE user_id = ?`)
    .bind(userId).first<{ plan: PlanId; status: string; current_period_end: number | null }>();
  let id: PlanId = row?.plan && row.plan in LIMITS ? row.plan : 'free';
  const expired = row?.current_period_end != null && row.current_period_end < Date.now();
  if (row && row.status !== 'active' && row.status !== 'trialing' && expired) id = 'free';
  return { id, limits: LIMITS[id] };
}

/**
 * Bring a user's data within their plan, e.g. after a downgrade:
 * pause monitors beyond the limit (newest first), slow down too-fast checks,
 * and switch branding back on if the plan requires it.
 */
export async function enforcePlan(db: D1Database, userId: string) {
  const { limits } = await getPlan(db, userId);
  await db.batch([
    db.prepare(
      `UPDATE monitors SET status = 'paused' WHERE user_id = ? AND status != 'paused' AND id NOT IN (
         SELECT id FROM monitors WHERE user_id = ? AND status != 'paused' ORDER BY created_at LIMIT ?)`,
    ).bind(userId, userId, limits.monitors),
    db.prepare(`UPDATE monitors SET interval_sec = ? WHERE user_id = ? AND interval_sec < ?`).bind(limits.minIntervalSec, userId, limits.minIntervalSec),
    ...(limits.removeBranding ? [] : [db.prepare(`UPDATE status_pages SET show_branding = 1 WHERE user_id = ?`).bind(userId)]),
  ]);
}
