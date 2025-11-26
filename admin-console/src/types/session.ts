export type Session = {
  orgId: string;
  apiKey: string;
  role?: 'superadmin' | 'admin' | 'shift_manager' | 'auditor' | 'read-only';
};
