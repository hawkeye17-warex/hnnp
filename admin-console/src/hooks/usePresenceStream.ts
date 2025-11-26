import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {PresenceEvent} from '../types/presence';

type PresenceFilters = {
  from?: string;
  to?: string;
  locationId?: string;
  receiverId?: string;
  groupId?: string;
};

export function usePresenceStream(filters?: PresenceFilters) {
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
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        if (!baseUrl) throw new Error('Missing backend base URL');
        const params = new URLSearchParams();
        params.set('orgId', session.orgId);
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v) params.set(k, v);
        });
        const res = await fetch(`${baseUrl}/v1/presence/events?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.apiKey}`,
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch presence (${res.status})`);
        const text = await res.text();
        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (!isJson) {
          throw new Error(text || 'Received non-JSON response');
        }
        let json: any = [];
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Received invalid JSON response');
        }
        const raw = Array.isArray(json) ? json : json?.events ?? json?.data ?? [];
        const mapped: PresenceEvent[] = raw.map((ev: any) => ({
          id: ev.id ?? String(Math.random()),
          timestamp: ev.timestamp ?? ev.occurredAt ?? ev.createdAt ?? new Date().toISOString(),
          userName: ev.userName,
          userRef: ev.userRef,
          locationName: ev.locationName,
          receiverName: ev.receiverName,
          eventType: ev.eventType === 'leave' ? 'leave' : 'join',
          hpsStatus: ev.hpsStatus ?? 'unknown',
        }));
        if (!cancelled) setData(mapped);
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
  }, [JSON.stringify(filters), session]);

  return {data, isLoading, error};
}
