import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {PresenceEvent} from '../types/presence';
import {apiFetch} from '../api/client';

type PresenceParams = {
  receiverId?: string;
  from?: string;
  to?: string;
  limit?: number;
  sort?: 'asc' | 'desc';
};

export function usePresenceStream(params?: PresenceParams) {
  const {session} = useSession();
  const [data, setData] = useState<PresenceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session) {
        setError('Not authenticated');
        setData([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        Object.entries(params || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
        });
        const json: any = await apiFetch(
          `/v2/orgs/${encodeURIComponent(session.orgId)}/presence${qs.toString() ? `?${qs.toString()}` : ''}`,
        );
        const raw = Array.isArray(json) ? json : json?.events ?? json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load presence');
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session, JSON.stringify(params)]);

  return {data, isLoading, error};
}
