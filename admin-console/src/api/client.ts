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

  const getOrg = async () => {
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch org');
    return res.json();
  };

  const getOrganizations = async () => {
    const res = await fetch(`${baseUrl}/v2/orgs`, {
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

  const getReceivers = async () => {
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/receivers`, {
      headers: buildHeaders(session),
    });
    if (!res.ok) throw new Error('Failed to fetch receivers');
    return res.json();
  };

  const createReceiver = async (payload: ReceiverPayload) => {
    const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/receivers`, {
      method: 'POST',
      headers: buildHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create receiver');
    return res.json();
  };

  const updateReceiver = async (id: string, payload: ReceiverPayload) => {
    const res = await fetch(
      `${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/receivers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: buildHeaders(session),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error('Failed to update receiver');
    return res.json();
  };

  const getPresenceEvents = async (params: Record<string, string | number> = {}) => {
    const search = new URLSearchParams({
      orgId: session.orgId,
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
    getOrganizations,
    createOrganization,
    getReceivers,
    createReceiver,
    updateReceiver,
    getPresenceEvents,
    getLinks,
    createLink,
    activateLink,
    revokeLink,
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
