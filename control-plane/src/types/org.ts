export type OrgSummary = {
  org_id: string;
  org_name: string;
  org_type: string;
  enabled_modules: string[];
  status?: string;
  created_at?: string;
  updated_at?: string;
  slug?: string;
};
