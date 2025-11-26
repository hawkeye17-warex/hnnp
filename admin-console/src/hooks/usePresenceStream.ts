import {useEffect, useState} from 'react';
import type {PresenceEvent} from '../types/presence';

const PRESENCE_API_BASE = '/api/presence';

type PresenceFilters = {
  from?: string;
  to?: string;
  locationId?: string;
  receiverId?: string;
};

export function usePresenceStream(filters?: PresenceFilters) {
  const [data, setData] = useState<PresenceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint once available
        const query = new URLSearchParams(
          Object.entries(filters || {}).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v) acc[k] = v;
            return acc;
          }, {}),
        ).toString();
        const res = await fetch(`${PRESENCE_API_BASE}${query ? `?${query}` : ''}`);
        if (!res.ok) throw new Error(`Failed to fetch presence (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
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
  }, [JSON.stringify(filters)]);

  return {data, isLoading, error};
}
