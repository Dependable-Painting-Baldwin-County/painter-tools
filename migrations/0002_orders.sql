CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_ts TEXT NOT NULL,
  status TEXT NOT NULL,               -- pending | scheduled | paid | canceled
  name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  page TEXT,
  session TEXT,
  source TEXT,
  subtotal_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,
  deposit_cents INTEGER DEFAULT 0,
  balance_cents INTEGER DEFAULT 0,
  schedule_json TEXT                  -- JSON blob with requested/confirmed window
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT,
  sku TEXT,
  qty INTEGER,
  unit TEXT,
  unit_price_cents INTEGER,
  total_cents INTEGER,
  meta_json TEXT,                     -- echo of options/line details
  PRIMARY KEY(order_id, sku)
);