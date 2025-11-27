import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import {apiFetch} from '../api/client';

export type OrgConfig = {
  id?: string;
  name?: string;
  timezone?: string;
  contactEmail?: string;
  orgType?: string;
  enabledModules?: string[];
};

export function useOrgConfig() {
  const {session} = useSession();
  const [data, setData] = useState<OrgConfig | null>(null);
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
        const json = await apiFetch(`/api/org/config`);
        if (!cancelled)
          setData({
            id: json?.org_id ?? json?.id,
            name: json?.org_name ?? json?.name,
            timezone: json?.timezone,
            contactEmail: json?.contactEmail,
            orgType: json?.org_type ?? json?.orgType ?? 'office',
            enabledModules: json?.enabled_modules ?? json?.enabledModules ?? [],
          });
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load org config');
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
