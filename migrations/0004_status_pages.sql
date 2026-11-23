-- Public status pages: each user can publish pages that show selected monitors.
CREATE TABLE status_pages (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,                 -- public URL: /s/<slug>
  title TEXT NOT NULL,
  description TEXT,
  show_branding INTEGER NOT NULL DEFAULT 1,  -- "Powered by UptimeRun" footer
  created_at INTEGER NOT NULL
);
CREATE INDEX status_pages_user_idx ON status_pages(user_id);

CREATE TABLE status_page_monitors (
  page_id TEXT NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (page_id, monitor_id)
);
CREATE INDEX status_page_monitors_monitor_idx ON status_page_monitors(monitor_id);
