CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_payment_intent_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,               -- pending | scheduled | paid | canceled | completed
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  service_address TEXT,
  city TEXT,
  package_type TEXT,
  amount REAL DEFAULT 0,              -- Dollar amount (not cents)
  currency TEXT DEFAULT 'usd',
  page TEXT,
  session TEXT,
  source TEXT,
  subtotal_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,
  deposit_cents INTEGER DEFAULT 0,
  balance_cents INTEGER DEFAULT 0,
  schedule_json TEXT,                  -- JSON blob with requested/confirmed window
  payment_metadata TEXT               -- JSON blob with payment details
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id INTEGER,
  stripe_payment_intent_id TEXT,
  sku TEXT,
  qty INTEGER,
  unit TEXT,
  unit_price_cents INTEGER,
  total_cents INTEGER,
  meta_json TEXT,                     -- echo of options/line details
  PRIMARY KEY(order_id, sku),
  FOREIGN KEY(order_id) REFERENCES orders(id)
);