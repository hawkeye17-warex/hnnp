-- Receivers table definition
CREATE TABLE IF NOT EXISTS receivers (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT,
  location TEXT,
  device_id TEXT,
  secret_key TEXT,
  last_seen_at TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_receivers_org_id ON receivers (org_id);
CREATE INDEX IF NOT EXISTS idx_receivers_device_id ON receivers (device_id);
