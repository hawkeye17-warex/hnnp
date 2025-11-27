import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {Incident} from '../types/incidents';
import {apiFetch} from '../api/client';

type IncidentFilters = {
  from?: string;
  to?: string;
  severity?: 'info' | 'warning' | 'critical';
  locationId?: string;
};

export function useIncidents(filters?: IncidentFilters) {
  const {session} = useSession();
  const [data, setData] = useState<Incident[]>([]);
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
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v) params.set(k, String(v));
        });
        const json: any = await apiFetch(
          `/v2/orgs/${encodeURIComponent(session.orgId)}/incidents${params.toString() ? `?${params.toString()}` : ''}`,
        );
        const raw = Array.isArray(json) ? json : json?.incidents ?? json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load incidents');
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
