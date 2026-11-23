-- Advanced check settings per monitor.
ALTER TABLE monitors ADD COLUMN timeout_sec INTEGER NOT NULL DEFAULT 30;
ALTER TABLE monitors ADD COLUMN method TEXT NOT NULL DEFAULT 'HEAD';          -- 'HEAD' | 'GET'
ALTER TABLE monitors ADD COLUMN follow_redirects INTEGER NOT NULL DEFAULT 1;
