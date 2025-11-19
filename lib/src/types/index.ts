/**
 * BLE packet structure for HNNP v2, as defined in protocol/spec.md:
 *
 * - version: 1 byte (0x02)
 * - flags: 1 byte
 * - time_slot: 4 bytes (uint32, big-endian)
 * - token_prefix: 16 bytes
 * - mac: 8 bytes
 *
 * This interface represents the logical fields, not raw bytes.
 */
export interface BlePacketV2 {
  version: number;
  flags: number;
  time_slot: number;
  token_prefix: string; // 16-byte value encoded as hex or base64
  mac: string; // 8-byte value encoded as hex or base64
}

/**
 * Presence report JSON payload sent from receiver to Cloud at POST /v2/presence.
 *
 * Fields follow protocol/spec.md Section 7.4/7.5.
 */
export interface PresenceReport {
  org_id: string;
  receiver_id: string;
  timestamp: number; // Unix seconds
  time_slot: number;
  version: number;
  flags: number;
  token_prefix: string;
  mac: string;
  signature: string;
}

/**
 * Presence event as stored in Cloud, aligned with the conceptual data model
 * in protocol/spec.md Section 11.
 */
export interface PresenceEvent {
  event_id: string;
  org_id: string;
  device_id: string;
  receiver_id: string;
  timestamp: number;
  time_slot: number;
  link_id?: string | null;
  presence_session_id?: string | null;
  suspicious_flags?: number | Record<string, unknown> | null;
}

/**
 * Presence session groups presence events for an unknown device prior to linking,
 * as described in protocol/spec.md Section 11.
 */
export interface PresenceSession {
  presence_session_id: string;
  org_id: string;
  device_id: string;
  first_seen_at: number; // Unix seconds
  last_seen_at: number; // Unix seconds
  resolved_at?: number | null; // Unix seconds when linked/reconciled
}

/**
 * Link connects (org_id, device_id) with user_ref, per protocol/spec.md Section 11.
 */
export interface Link {
  link_id: string;
  org_id: string;
  device_id: string;
  user_ref: string;
  created_at: number; // Unix seconds
  revoked_at?: number | null;
}

/**
 * Receiver configuration values, matching protocol/spec.md Section 7.1.
 */
export interface ReceiverConfig {
  org_id: string;
  receiver_id: string;
  receiver_secret: string;
  api_base_url: string;
}

