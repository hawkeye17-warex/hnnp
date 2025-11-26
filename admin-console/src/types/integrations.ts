export type IntegrationSummary = {
  id: string;
  name: string;
  type: 'webhook' | 'lms' | 'hris' | 'custom';
  status: 'connected' | 'error' | 'disabled';
  lastSyncAt?: string;
};
