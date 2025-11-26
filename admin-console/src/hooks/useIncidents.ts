import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {Incident} from '../types/incidents';

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
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        if (!baseUrl) throw new Error('Missing backend base URL');
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v) params.set(k, String(v));
        });
        const res = await fetch(
          `${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/incidents${
            params.toString() ? `?${params.toString()}` : ''
          }`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'x-hnnp-api-key': session.apiKey,
            },
          },
        );
        const text = await res.text();
        if (!res.ok) {
          throw new Error(
            `Failed to fetch incidents (${res.status} ${res.statusText || ''})${text ? `: ${text}` : ''}`.trim(),
          );
        }
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
