import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { useSession } from './useSession';

export type HpsPolicy = {
  min_score: number;
  allow_fallback_gesture: boolean;
  require_hps_for_attendance: boolean;
  require_hps_for_access: boolean;
  updated_by?: string | null;
  updated_at?: string | null;
  org_id?: string;
};

export function useHpsPolicy() {
  const { session } = useSession();
  const [data, setData] = useState<HpsPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setError('Not authenticated');
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const json = await apiFetch<HpsPolicy>('/api/org/hps-policy');
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load HPS policy');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const save = useCallback(
    async (policy: Partial<HpsPolicy>) => {
      if (!session) {
        throw new Error('Not authenticated');
      }
      const json = await apiFetch<HpsPolicy>('/api/org/hps-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minScore: policy.min_score,
          allowFallbackGesture: policy.allow_fallback_gesture,
          requireHpsForAttendance: policy.require_hps_for_attendance,
          requireHpsForAccess: policy.require_hps_for_access,
        }),
      });
      setData(json);
      return json;
    },
    [session],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, reload: load, save };
}
