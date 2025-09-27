CREATE TABLE chat_log (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL,
  session TEXT,
  question TEXT,
  answer TEXT,
  ai_provider TEXT,
  user_agent TEXT,
  page TEXT
);
