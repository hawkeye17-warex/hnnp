import {useMemo} from 'react';

import {useSession} from '../hooks/useSession';
import type {Session} from '../types/session';

const getBaseUrl = () => {
  const url = import.meta.env.VITE_BACKEND_BASE_URL;
  if (!url) {
    throw new Error('Backend URL is not configured (VITE_BACKEND_BASE_URL)');
  }
  return url;
};

type ReceiverPayload = Record<string, unknown>;
type LinkPayload = Record<string, unknown>;

const buildHeaders = (session: Session) => ({
  'Content-Type': 'application/json',
  'x-hnnp-api-key': session.apiKey,
});

export const createApiClient = (session: Session) => {
  const baseUrl = getBaseUrl();

  const getOrg = async (orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch org');
    return res.json();
  };

  const getRealtimeMetrics = async (
    orgId?: string,
    params: {windowSeconds?: number; receiversMinutes?: number} = {},
  ) => {
    const id = orgId ?? session.orgId;
    const url = new URL(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/metrics/realtime`);
    if (params.windowSeconds) url.searchParams.set('window_seconds', String(params.windowSeconds));
    if (params.receiversMinutes) url.searchParams.set('receivers_minutes', String(params.receiversMinutes));
    const res = await fetch(url.toString(), {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to load realtime metrics');
    return res.json();
  };

  const getOrganizations = async (includeKeys = false) => {
    const url = new URL(`${baseUrl}/v2/orgs`);
    if (includeKeys) {
      url.searchParams.set('include_keys', 'true');
    }
    const res = await fetch(url.toString(), {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch organizations');
    return res.json();
  };

  const createOrganization = async (payload: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl}/v2/orgs`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create organization');
    return res.json();
  };

  const updateOrganization = async (
    payload: Record<string, unknown>,
    orgId?: string,
  ) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update organization');
    return res.json();
  };

  const getReceivers = async (orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/receivers`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch receivers');
    return res.json();
  };

  const createReceiver = async (payload: ReceiverPayload, orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/receivers`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create receiver');
    return res.json();
  };

  const updateReceiver = async (id: string, payload: ReceiverPayload, orgId?: string) => {
    const org = orgId ?? session.orgId;
    const res = await fetch(
      `${baseUrl}/v2/orgs/${encodeURIComponent(org)}/receivers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: buildHeaders(session),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error('Failed to update receiver');
    return res.json();
  };

  const getPresenceEvents = async (params: Record<string, string | number> = {}, orgId?: string) => {
    const search = new URLSearchParams({
      orgId: orgId ?? session.orgId,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const res = await fetch(`${baseUrl}/v1/presence/events?${search.toString()}`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch presence events');
    return res.json();
  };

  const getLinks = async (params: Record<string, string | number> = {}) => {
    const search = new URLSearchParams({
      orgId: session.orgId,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const res = await fetch(`${baseUrl}/v1/links?${search.toString()}`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch links');
    return res.json();
  };

  /* ---------------- API Keys ---------------- */
  const getApiKeys = async (orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/keys`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch API keys');
    return res.json();
  };

  const generateApiKey = async (keyType: 'ADMIN_KEY' | 'RECEIVER_KEY', orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/keys`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify({type: keyType}),
    });
    if (!res.ok) throw new Error('Failed to generate API key');
    return res.json();
  };

  const rotateApiKey = async (keyType: 'ADMIN_KEY' | 'RECEIVER_KEY', orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(
      `${baseUrl}/v2/orgs/${encodeURIComponent(id)}/keys/${encodeURIComponent(keyType)}/rotate`,
      {
        method: 'POST',
        headers: buildHeaders(session),
      },
    );
    if (!res.ok) throw new Error('Failed to rotate API key');
    return res.json();
  };

  const getSystemSettings = async (orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/settings`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to load system settings');
    return res.json();
  };

  const updateSystemSettings = async (payload: Record<string, unknown>, orgId?: string) => {
    const id = orgId ?? session.orgId;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/settings`, {
      method: 'PATCH',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update system settings');
    return res.json();
  };

  /* ---------------- Org Users ---------------- */
  const getOrgUsers = async (orgId?: string, params: Record<string, string | number> = {}) => {
    const id = orgId ?? session.orgId;
    const search = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
    const url = `${baseUrl}/v2/orgs/${encodeURIComponent(id)}/users${search.toString() ? `?${search.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch organization users');
    return res.json();
  };

  const getOrgProfiles = async (orgId?: string, search?: string) => {
    const id = orgId ?? session.orgId;
    const url = new URL(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/profiles`);
    if (search) url.searchParams.set('q', search);
    const res = await fetch(url.toString(), {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch user profiles');
    return res.json();
  };

  const createOrgProfile = async (orgId: string, payload: Record<string, unknown>) => {
    const url = `${baseUrl}/v2/orgs/${encodeURIComponent(orgId)}/profiles`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create user profile');
    return res.json();
  };

  const updateOrgProfile = async (orgId: string, profileId: string, payload: Record<string, unknown>) => {
    const url = `${baseUrl}/v2/orgs/${encodeURIComponent(orgId)}/profiles/${encodeURIComponent(profileId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update user profile');
    return res.json();
  };

  /* ---------------- Org Metrics / Errors ---------------- */
  const getOrgUsageMetrics = async (params: Record<string, string | number> = {}, orgId?: string) => {
    const id = orgId ?? session.orgId;
    const search = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/metrics/usage?${search.toString()}`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch usage metrics');
    return res.json();
  };

  const getOrgErrors = async (params: Record<string, string | number> = {}, orgId?: string) => {
    const id = orgId ?? session.orgId;
    const search = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/errors?${search.toString()}`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch org errors');
    return res.json();
  };

  const inviteOrgUser = async (
    email: string,
    role: string | undefined = undefined,
    orgId?: string,
  ) => {
    const id = orgId ?? session.orgId;
    const body: Record<string, unknown> = {email};
    if (role) body.role = role;
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(id)}/invite`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to send invite');
    return res.json();
  };

  /* ---------------- Admin Users ---------------- */
  const getAdminUsers = async () => {
    const res = await fetch(`${baseUrl}/internal/admin-users`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch admin users');
    return res.json();
  };

  const createAdminUser = async (payload: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl}/internal/admin-users`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create admin user');
    return res.json();
  };

  const updateAdminUser = async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl}/internal/admin-users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update admin user');
    return res.json();
  };

  const deleteAdminUser = async (id: string) => {
    const res = await fetch(`${baseUrl}/internal/admin-users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to delete admin user');
    return true;
  };

  const createLink = async (payload: LinkPayload) => {
    const res = await fetch(`${baseUrl}/v1/links`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create link');
    return res.json();
  };

  const activateLink = async (id: string) => {
    const res = await fetch(`${baseUrl}/v1/links/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to activate link');
    return res.json();
  };

  const revokeLink = async (id: string) => {
    const res = await fetch(`${baseUrl}/v1/links/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to revoke link');
    return res.json();
  };

  return {
    getOrg,
    getRealtimeMetrics,
    getOrganizations,
    createOrganization,
    updateOrganization,
    getReceivers,
    createReceiver,
    updateReceiver,
    getPresenceEvents,
    getLinks,
    createLink,
    activateLink,
    revokeLink,
    getApiKeys,
    generateApiKey,
    rotateApiKey,
    getSystemSettings,
    updateSystemSettings,
    getOrgUsers,
    getOrgProfiles,
    createOrgProfile,
    updateOrgProfile,
    getOrgProfileActivity: async (orgId: string, profileId: string) => {
      const url = `${baseUrl}/v2/orgs/${encodeURIComponent(orgId)}/profiles/${encodeURIComponent(profileId)}/activity`;
      const res = await fetch(url, {
        headers: buildHeaders(session),
      });
      if (!res.ok) throw new Error('Failed to load profile activity');
      return res.json();
    },
    inviteOrgUser,
    getOrgUsageMetrics,
    getOrgErrors,
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    // Audit logs (admin/superadmin)
    getAuditLogs: async (params: Record<string, string | number> = {}) => {
      const search = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
      const res = await fetch(
        `${baseUrl}/internal/audit-logs${search.toString() ? `?${search.toString()}` : ""}`,
        {
          headers: buildHeaders(session),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    globalSearch: async (query: string) => {
      const search = new URLSearchParams({ q: query });
      const res = await fetch(`${baseUrl}/internal/search?${search.toString()}`, {
        headers: buildHeaders(session),
      });
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    getMaintenance: async () => {
      const res = await fetch(`${baseUrl}/internal/maintenance`);
      if (!res.ok) throw new Error("Failed to load maintenance state");
      return res.json();
    },
    setMaintenance: async (enabled: boolean, message?: string) => {
      const res = await fetch(`${baseUrl}/internal/maintenance`, {
        method: "POST",
        headers: buildHeaders(session),
        body: JSON.stringify({ enabled, message }),
      });
      if (!res.ok) throw new Error("Failed to update maintenance state");
      return res.json();
    },
    getMe: async () => {
      const res = await fetch(`${baseUrl}/v2/me`, {
        headers: buildHeaders(session),
      });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  };
};

export const useApi = () => {
  const {session} = useSession();
  const client = useMemo(() => {
    if (!session) {
      throw new Error('Not authenticated');
    }
    return createApiClient(session);
  }, [session]);

  return client;
};
