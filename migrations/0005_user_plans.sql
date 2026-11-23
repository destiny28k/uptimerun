-- Which plan each user is on. No row = Free. Payments will fill this in.
CREATE TABLE user_plans (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',          -- 'free' | 'pro' | 'business'
  billing TEXT,                               -- 'monthly' | 'yearly'
  status TEXT NOT NULL DEFAULT 'active',      -- 'active' | 'trialing' | 'past_due' | 'cancelled'
  current_period_end INTEGER,                 -- unix ms
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  updated_at INTEGER NOT NULL
);
