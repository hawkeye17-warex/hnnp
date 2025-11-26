import {useEffect, useState} from 'react';
import type {HpsStat} from '../types/hps';

const HPS_API_BASE = '/api/hps';

export function useHpsStats() {
  const [data, setData] = useState<HpsStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint once available
        const res = await fetch(`${HPS_API_BASE}/stats`);
        if (!res.ok) throw new Error(`Failed to fetch HPS stats (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
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
  }, []);

  return {data, isLoading, error};
}
