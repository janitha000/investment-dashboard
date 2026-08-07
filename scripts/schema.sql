-- LankaWealth Neon schema (single-user)
-- Optional reference — the app also auto-creates these tables via ensureSchema()
-- on first database access. Safe to run manually in Neon SQL Editor if preferred.

CREATE TABLE IF NOT EXISTS portfolio_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO portfolio_state (id, data)
VALUES (1, '{"fds":[],"uts":[],"treasury":[],"dividends":[],"pfcaFds":[]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  label TEXT,
  portfolio JSONB NOT NULL,
  totals JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_snapshots_timestamp_idx
  ON portfolio_snapshots (timestamp DESC);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO scenarios (id, data)
VALUES (1, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
