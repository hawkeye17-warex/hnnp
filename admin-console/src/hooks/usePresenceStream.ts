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
  const [paused, setPaused] = useState(false);

  const MAX_EVENTS = 200;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (paused) return;
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
        if (!cancelled) {
          setData(prev => {
            const next = raw;
            if (next.length > MAX_EVENTS) return next.slice(-MAX_EVENTS);
            return next;
          });
        }
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
  }, [session, JSON.stringify(params), paused]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return {data, isLoading, error, paused, pause, resume};
}
