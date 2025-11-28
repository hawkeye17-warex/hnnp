export type Incident = {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  relatedLocationName?: string;
  relatedReceiverName?: string;
  loa_level?: string | null;
  use_case?: string | null;
};
