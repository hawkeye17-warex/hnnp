import {useCallback, useEffect, useState} from 'react';
import {apiFetch} from '../api/client';

export type AuditEvent = {
  id: string;
  org_id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type AuditEventFilters = {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

type State = {
  data: AuditEvent[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
};

export function useAuditEvents(initialFilters: AuditEventFilters = {}) {
  const [state, setState] = useState<State>({data: [], nextCursor: null, loading: true, error: null});
  const [filters, setFilters] = useState<AuditEventFilters>(initialFilters);

  const load = useCallback(
    async (override?: AuditEventFilters) => {
      setState(s => ({...s, loading: true, error: null}));
      try {
        const params = new URLSearchParams();
        const f = {...filters, ...(override ?? {})};
        if (f.action) params.set('action', f.action);
        if (f.userId) params.set('user_id', f.userId);
        if (f.from) params.set('from', f.from);
        if (f.to) params.set('to', f.to);
        if (f.limit) params.set('limit', String(f.limit));
        const res = await apiFetch<{items: AuditEvent[]; next_cursor: string | null}>(
          `/api/org/audit${params.toString() ? `?${params.toString()}` : ''}`,
        );
        setState({data: res.items ?? [], nextCursor: res.next_cursor ?? null, loading: false, error: null});
      } catch (err: any) {
        setState(s => ({...s, loading: false, error: err?.message ?? 'Failed to fetch audit events'}));
      }
    },
    [filters],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    setFilters,
    refetch: load,
  };
}
