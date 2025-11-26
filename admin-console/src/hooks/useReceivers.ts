import {useEffect, useState} from 'react';
import type {ReceiverSummary} from '../types/receivers';

const RECEIVERS_API_BASE = '/api/receivers';

export function useReceivers() {
  const [data, setData] = useState<ReceiverSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint once available
        const res = await fetch(RECEIVERS_API_BASE);
        if (!res.ok) throw new Error(`Failed to fetch receivers (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load receivers');
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
