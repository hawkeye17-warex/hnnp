import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import {apiFetch} from '../api/client';

export type HpsConfig = {
  minScore?: number;
  microGestureFallback?: boolean;
  requiredForAttendance?: boolean;
  requiredForAccess?: boolean;
};

export function useHpsConfig() {
  const {session} = useSession();
  const [data, setData] = useState<HpsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!session) {
        setError('Not authenticated');
        setData(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/hps/config`);
        const cfg = json?.config ?? json ?? null;
        if (!cancelled) setData(cfg);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load HPS config');
        if (!cancelled) setData(null);
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
