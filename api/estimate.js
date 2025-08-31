// SQL table creation statements as JavaScript strings
const createLeadsTable = `
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  phone TEXT,
  service TEXT,
  message TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  gclid TEXT,
  page TEXT,
  session TEXT,
  ip TEXT,
  ua TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const createChatLogTable = `
CREATE TABLE IF NOT EXISTS chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT,
  session TEXT,
  question TEXT,
  answer TEXT,
  ai_provider TEXT,
  user_agent TEXT,
  page TEXT
);
`;

const createEventsTable = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT,
  type TEXT,
  page TEXT,
  service TEXT,
  source TEXT,
  device TEXT,
  city TEXT,
  country TEXT,
  session TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  gclid TEXT,
  scroll_pct TEXT,
  clicks TEXT,
  call TEXT,
  duration_ms TEXT,
  button TEXT,
  zip TEXT,
  area TEXT
);
`;

// Example: Execute these statements using your database library, e.g. sqlite3
// const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database('your-database.db');
// db.serialize(() => {
//   db.run(createLeadsTable);
//   db.run(createChatLogTable);
//   db.run(createEventsTable);
// });