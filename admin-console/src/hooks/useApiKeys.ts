import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {IntegrationSummary} from '../types/integrations';
import {apiFetch} from '../api/client';

export function useApiKeys(orgId?: string) {
  const {session} = useSession();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const effectiveOrg = orgId ?? session?.orgId;
      if (!effectiveOrg) {
        setError('Not authenticated');
        setData([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(effectiveOrg)}/api-keys`);
        const raw = Array.isArray(json) ? json : json?.keys ?? json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load API keys');
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, session?.orgId]);

  return {data, isLoading, error};
}
