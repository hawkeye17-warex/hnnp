export type Incident = {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  relatedLocationName?: string;
  relatedReceiverName?: string;
};
