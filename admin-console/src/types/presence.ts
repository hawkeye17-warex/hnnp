export type PresenceEvent = {
  id: string;
  timestamp: string;
  userName?: string;
  userRef?: string;
  locationName?: string;
  receiverName?: string;
  eventType: 'join' | 'leave';
  hpsStatus?: 'verified' | 'low' | 'failed' | 'unknown';
};
