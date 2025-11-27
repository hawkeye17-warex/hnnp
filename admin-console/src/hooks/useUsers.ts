import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {UserSummary} from '../types/users';
import {apiFetch} from '../api/client';

export function useUsers(refreshKey = 0) {
  const {session} = useSession();
  const [data, setData] = useState<UserSummary[]>([]);
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
        const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/users`);
        const raw = Array.isArray(json) ? json : json?.users ?? json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load users');
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
