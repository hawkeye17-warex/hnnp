export type HistoryEvent = {
  id: string;
  place: string;
  time: string;
  status: 'verified' | 'searching' | 'error';
  note?: string;
  location?: string;
};
