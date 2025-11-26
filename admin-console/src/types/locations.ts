export type LocationSummary = {
  id: string;
  name: string;
  code?: string;
  campusOrSite?: string;
  receiverCount?: number;
  status?: 'active' | 'inactive';
};
