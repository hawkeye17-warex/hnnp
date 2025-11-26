import {useEffect, useState} from 'react';
import type {LogEntry} from '../types/logs';

const LOGS_API_BASE = '/api/logs';

type LogFilters = {
  from?: string;
  to?: string;
  level?: 'info' | 'warn' | 'error';
  category?: string;
};

export function useLogs(filters?: LogFilters) {
  const [data, setData] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint once available
        const query = new URLSearchParams(
          Object.entries(filters || {}).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v) acc[k] = v;
            return acc;
          }, {}),
        ).toString();
        const res = await fetch(`${LOGS_API_BASE}${query ? `?${query}` : ''}`);
        if (!res.ok) throw new Error(`Failed to fetch logs (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load logs');
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filters)]);

  return {data, isLoading, error};
}
