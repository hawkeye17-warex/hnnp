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
  edited_by?: string | null;
  edited_at?: string | null;
};

export type Break = {
  id: string;
  shift_id: string;
  start_time: string;
  end_time?: string | null;
  total_seconds?: number | null;
  type?: string | null;
  created_at?: string;
  edited_by?: string | null;
  edited_at?: string | null;
};

export type LiveShift = {
  id: string;
  profile_id: string;
  user_id?: string | null;
  start_time: string;
  status: string;
  duration_seconds: number;
  last_receiver_id?: string | null;
};

export type LiveBreak = {
  id: string;
  shift_id: string;
  profile_id?: string | null;
  user_id?: string | null;
  start_time: string;
  duration_seconds: number;
  type?: string | null;
};
