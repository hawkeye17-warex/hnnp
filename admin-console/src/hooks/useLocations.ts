import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {LocationSummary} from '../types/locations';
import {apiFetch} from '../api/client';

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
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/locations`);
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
