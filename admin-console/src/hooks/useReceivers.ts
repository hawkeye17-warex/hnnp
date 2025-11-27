import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {ReceiverSummary} from '../types/receivers';
import {apiFetch} from '../api/client';

export function useReceivers(refreshKey = 0) {
  const {session} = useSession();
  const [data, setData] = useState<ReceiverSummary[]>([]);
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
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/receivers`);
        const raw = Array.isArray(json) ? json : json?.receivers ?? json?.data ?? [];
        const mapped: ReceiverSummary[] = raw.map((r: any) => ({
          id: r.id ?? '',
          name: r.name ?? r.displayName ?? r.id ?? 'Receiver',
          locationName: r.location ?? r.locationName,
          status: r.status === 'online' ? 'online' : r.status === 'offline' ? 'offline' : 'flaky',
          lastHeartbeatAt: r.last_seen_at ?? r.lastSeenAt,
          firmwareVersion: r.firmwareVersion,
        }));
        if (!cancelled) setData(mapped);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load receivers');
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session, refreshKey]);

  return {data, isLoading, error};
}
