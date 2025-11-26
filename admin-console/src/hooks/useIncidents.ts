import {useEffect, useState} from 'react';
import type {Incident} from '../types/incidents';

const INCIDENTS_API_BASE = '/api/incidents';

type IncidentFilters = {
  from?: string;
  to?: string;
  severity?: 'info' | 'warning' | 'critical';
  locationId?: string;
};

export function useIncidents(filters?: IncidentFilters) {
  const [data, setData] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint when backend is ready
        const query = new URLSearchParams(
          Object.entries(filters || {}).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v) acc[k] = v;
            return acc;
          }, {}),
        ).toString();
        const res = await fetch(`${INCIDENTS_API_BASE}${query ? `?${query}` : ''}`);
        if (!res.ok) throw new Error(`Failed to fetch incidents (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
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
  }, [JSON.stringify(filters)]);

  return {data, isLoading, error};
}
