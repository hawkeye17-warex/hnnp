import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {LocationSummary} from '../types/locations';

export function useLocations(refreshKey = 0) {
  const {session} = useSession();
  const [data, setData] = useState<LocationSummary[]>([]);
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
        // TODO: replace endpoint with real locations API when available
        const url = `${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/locations`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.apiKey}`,
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch locations (${res.status})`);
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
        const raw = Array.isArray(json) ? json : json?.locations ?? json?.data ?? [];
        const mapped: LocationSummary[] = raw.map((loc: any) => ({
          id: loc.id ?? '',
          name: loc.name ?? loc.code ?? 'Location',
          code: loc.code,
          campusOrSite: loc.campus ?? loc.site,
          receiverCount: loc.receiverCount,
          status: loc.status as LocationSummary['status'],
        }));
        if (!cancelled) setData(mapped);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load locations');
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
