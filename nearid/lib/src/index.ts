export type TimeSlot = number;
export type UnixTimestamp = number;
export type TokenPrefixHex = string; // 16-byte hex string (32 hex chars) in v2
export type MacHex = string; // 8-byte hex string (16 hex chars) in v2

export interface DeviceId {
  value: string;
}

export interface PresenceEventCore {
  orgId: string;
  receiverId: string;
  timeSlot: TimeSlot;
  timestamp: UnixTimestamp;
  tokenPrefix: TokenPrefixHex;
}

export * from "./crypto";
export * from "./time";
export * from "./types";
