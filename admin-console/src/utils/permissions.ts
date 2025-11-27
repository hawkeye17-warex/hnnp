import type {CurrentUser} from '../context/AuthContext';

export type OrgRole = 'owner' | 'admin' | 'viewer' | 'hr' | 'security';

const ROLE_WEIGHT: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  hr: 2,
  security: 2,
  viewer: 1,
};

export function hasRole(user: CurrentUser | null, required?: OrgRole | OrgRole[]) {
  if (!required) return true;
  const roles = Array.isArray(required) ? required : [required];
  if (!user?.role) return false;
  const userWeight = ROLE_WEIGHT[user.role] ?? 0;
  return roles.some(r => userWeight >= (ROLE_WEIGHT[r] ?? 0));
}

export function can(user: CurrentUser | null, permission?: string) {
  if (!permission) return true;
  const list = user?.permissions ?? [];
  if (list.includes('*')) return true;
  return list.includes(permission);
}
