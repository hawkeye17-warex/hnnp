export type AttendanceRecord = {
  id: string;
  userName: string;
  userRef: string;
  sessionName: string;
  status: 'present' | 'late' | 'absent';
  firstSeenAt?: string;
  lastSeenAt?: string;
  durationMinutes?: number;
  hpsStatus?: 'verified' | 'low' | 'failed' | 'unknown';
};

export type GroupOrSession = {
  id: string;
  name: string;
  type: 'class' | 'group' | 'shift' | 'custom';
  locationName?: string;
  scheduleDescription?: string;
};
