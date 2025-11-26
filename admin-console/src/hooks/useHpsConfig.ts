import {useEffect, useState} from 'react';
import {useSession} from './useSession';

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
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        if (!baseUrl) throw new Error('Missing backend base URL');
        const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/hps/config`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.apiKey}`,
          },
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(
            `Failed to fetch HPS config (${res.status} ${res.statusText || ''})${text ? `: ${text}` : ''}`.trim(),
          );
        }
        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (!isJson) {
          throw new Error(text || 'Received non-JSON response');
        }
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Received invalid JSON response');
        }
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
