-- Domain and SSL certificate expiry, checked once a day per monitor.
ALTER TABLE monitors ADD COLUMN domain_expires_at INTEGER;      -- unix ms, null = unknown
ALTER TABLE monitors ADD COLUMN ssl_expires_at INTEGER;         -- unix ms, null = unknown
ALTER TABLE monitors ADD COLUMN ssl_issuer TEXT;
ALTER TABLE monitors ADD COLUMN expiry_checked_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE monitors ADD COLUMN expiry_alerted TEXT NOT NULL DEFAULT '';  -- e.g. 'ssl:30,domain:14' (thresholds already alerted)
CREATE INDEX monitors_expiry_idx ON monitors(expiry_checked_at);
