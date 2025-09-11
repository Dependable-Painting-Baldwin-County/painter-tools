-- Chat log table for AI assistant interactions
CREATE TABLE IF NOT EXISTS chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  session TEXT,
  question TEXT,
  answer TEXT,
  ai_provider TEXT,
  user_agent TEXT,
  page TEXT
);
