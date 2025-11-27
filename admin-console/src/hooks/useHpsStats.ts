import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {HpsStat} from '../types/hps';
import {apiFetch} from '../api/client';

export function useHpsStats() {
  const {session} = useSession();
  const [data, setData] = useState<HpsStat[]>([]);
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
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/hps/stats`);
        const raw = Array.isArray(json) ? json : json?.stats ?? json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load HPS stats');
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return {data, isLoading, error};
}
