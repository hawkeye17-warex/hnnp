-- HNNP Cloud API v2 initial schema
-- Tables: devices, device_keys, receivers, links, presence_sessions, presence_events
-- Aligned with protocol/spec.md Section 11 (Data Model).

CREATE TABLE IF NOT EXISTS devices (
    device_id        TEXT PRIMARY KEY,
    device_id_base   BYTEA NOT NULL,
    org_id           TEXT,
    first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registered       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_devices_org_id ON devices (org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_org_base ON devices (org_id, device_id_base);

CREATE TABLE IF NOT EXISTS device_keys (
    org_id          TEXT NOT NULL,
    device_id       TEXT NOT NULL,
    device_auth_key BYTEA NOT NULL,
    registration_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, device_id),
    CONSTRAINT fk_device_keys_device
      FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receivers (
    org_id          TEXT NOT NULL,
    receiver_id     TEXT NOT NULL,
    receiver_secret BYTEA NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ,
    PRIMARY KEY (org_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS links (
    link_id     TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL,
    device_id   TEXT NOT NULL,
    user_ref    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ,
    CONSTRAINT fk_links_device
      FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_org_device ON links (org_id, device_id);

CREATE TABLE IF NOT EXISTS presence_sessions (
    presence_session_id TEXT PRIMARY KEY,
    org_id              TEXT NOT NULL,
    device_id           TEXT NOT NULL,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    CONSTRAINT fk_presence_sessions_device
      FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_org_device ON presence_sessions (org_id, device_id);

CREATE TABLE IF NOT EXISTS presence_events (
    event_id            TEXT PRIMARY KEY,
    org_id              TEXT NOT NULL,
    device_id           TEXT NOT NULL,
    receiver_id         TEXT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL,
    time_slot           INTEGER NOT NULL,
    link_id             TEXT,
    presence_session_id TEXT,
    suspicious_flags    JSONB,
    CONSTRAINT fk_presence_events_device
      FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE,
    CONSTRAINT fk_presence_events_link
      FOREIGN KEY (link_id) REFERENCES links (link_id) ON DELETE SET NULL,
    CONSTRAINT fk_presence_events_session
      FOREIGN KEY (presence_session_id) REFERENCES presence_sessions (presence_session_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_presence_events_org_device_time ON presence_events (org_id, device_id, time_slot);
CREATE INDEX IF NOT EXISTS idx_presence_events_receiver_time ON presence_events (receiver_id, timestamp);

