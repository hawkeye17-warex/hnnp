import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {IntegrationSummary} from '../types/integrations';
import {apiFetch} from '../api/client';

export function useIntegrations() {
  const {session} = useSession();
  const [data, setData] = useState<IntegrationSummary[]>([]);
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
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/integrations`);
        const raw = Array.isArray(json) ? json : json?.integrations ?? json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load integrations');
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
