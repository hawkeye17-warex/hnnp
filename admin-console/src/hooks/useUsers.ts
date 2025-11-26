import {useEffect, useState} from 'react';
import type {UserSummary} from '../types/users';

const USERS_API_BASE = '/api/users';

export function useUsers() {
  const [data, setData] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint once available
        const res = await fetch(USERS_API_BASE);
        if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
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
  }, []);

  return {data, isLoading, error};
}
