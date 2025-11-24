export type UserProfile = {
  id: string;
  user_id: string;
  org_id: string;
  type: string;
  capabilities: string[];
  created_at: string;
};

export type MeResponse = {
  org: {
    id: string;
    name: string;
    slug?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
  };
  profiles: UserProfile[];
};
