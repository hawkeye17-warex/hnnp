export type UserSummary = {
  id: string;
  name: string;
  email?: string;
  role: string;
  lastSeenAt?: string;
  hpsVerificationRate?: number;
};
