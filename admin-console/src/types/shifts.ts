export type Shift = {
  id: string;
  profile_id: string;
  org_id: string;
  location_id?: string | null;
  start_time: string;
  end_time?: string | null;
  total_seconds?: number | null;
  created_by?: string | null;
  closed_by?: string | null;
  status: string;
  created_at?: string;
};

export type Break = {
  id: string;
  shift_id: string;
  start_time: string;
  end_time?: string | null;
  total_seconds?: number | null;
  type?: string | null;
  created_at?: string;
};
