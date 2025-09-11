CREATE TABLE IF NOT EXISTS lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  day TEXT NOT NULL,
  hour TEXT NOT NULL,
  type TEXT NOT NULL,
  page TEXT,
  service TEXT,
  source TEXT,
  device TEXT,
  city TEXT,
  country TEXT,
  zip TEXT,
  area TEXT,
  session TEXT,
  scroll_pct INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  gclid TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  zip TEXT,
  service TEXT,
  page TEXT,
  session TEXT,
  source TEXT,
  message TEXT
);