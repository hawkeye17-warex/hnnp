export type Org = {
  id: string;
  name: string;
  department?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  orgId: string;
};
