-- Better Auth tables (email + password login)
CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expiresAt" DATE NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON "session"("userId");

CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);
CREATE INDEX "account_userId_idx" ON "account"("userId");

CREATE TABLE "verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" DATE NOT NULL,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

-- App tables. Times are unix milliseconds.
CREATE TABLE monitors (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'http',          -- 'http' | 'keyword'
  keyword TEXT,
  interval_sec INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'up' | 'down' | 'paused'
  fail_count INTEGER NOT NULL DEFAULT 0,
  last_ms INTEGER,
  last_error TEXT,
  last_checked_at INTEGER,
  next_check_at INTEGER NOT NULL DEFAULT 0,
  history TEXT NOT NULL DEFAULT '',           -- last 60 results: 'u' up, 'd' down
  ms_history TEXT NOT NULL DEFAULT '',        -- last 60 response times, comma-separated
  status_since INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX monitors_user_idx ON monitors(user_id);
CREATE INDEX monitors_due_idx ON monitors(status, next_check_at);

-- One row per monitor per UTC day, for uptime percentages.
CREATE TABLE daily_stats (
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                          -- 'YYYY-MM-DD'
  total INTEGER NOT NULL DEFAULT 0,
  up INTEGER NOT NULL DEFAULT 0,
  sum_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (monitor_id, day)
);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY NOT NULL,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  cause TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX incidents_user_idx ON incidents(user_id, started_at DESC);
CREATE INDEX incidents_open_idx ON incidents(monitor_id, resolved_at);

CREATE TABLE alert_channels (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  type TEXT NOT NULL,                         -- 'email' | 'telegram'
  target TEXT NOT NULL,                       -- email address or Telegram chat id
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX alert_channels_user_idx ON alert_channels(user_id);
