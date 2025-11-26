export type ReceiverSummary = {
  id: string;
  name: string;
  locationName?: string;
  status: 'online' | 'offline' | 'flaky';
  lastHeartbeatAt?: string;
  firmwareVersion?: string;
};
