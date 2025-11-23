-- Presence logs table definition
CREATE TABLE IF NOT EXISTS presence_logs (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  user_id TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL,
  token_prefix TEXT,
  time_slot TEXT,
  version TEXT,
  flags JSONB,
  validation_status TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_presence_logs_org_id ON presence_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_presence_logs_receiver_id ON presence_logs (receiver_id);
CREATE INDEX IF NOT EXISTS idx_presence_logs_timestamp ON presence_logs ("timestamp");
