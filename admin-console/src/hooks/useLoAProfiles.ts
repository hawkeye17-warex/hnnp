import {useCallback, useEffect, useState} from 'react';
import {apiFetch} from '../api/client';

export type LoaProfile = {
  id: string;
  name: string;
  requirements?: any;
};

export type LoaAssignment = {
  id: string;
  use_case: string;
  loa_profile_id: string;
};

type State = {
  profiles: LoaProfile[];
  assignments: LoaAssignment[];
  loading: boolean;
  error: string | null;
};

export function useLoAProfiles() {
  const [state, setState] = useState<State>({profiles: [], assignments: [], loading: true, error: null});

  const load = useCallback(async () => {
    setState(s => ({...s, loading: true, error: null}));
    try {
      const res = await apiFetch<{profiles: LoaProfile[]; assignments: LoaAssignment[]}>('/api/org/loa-profile');
      setState({profiles: res.profiles ?? [], assignments: res.assignments ?? [], loading: false, error: null});
    } catch (err: any) {
      setState(s => ({...s, loading: false, error: err?.message ?? 'Failed to load LoA profiles'}));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateAssignments = useCallback(
    async (assignments: {use_case: string; loa_profile_id: string}[]) => {
      await apiFetch('/api/org/loa-profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({assignments}),
      });
      await load();
    },
    [load],
  );

  return {
    ...state,
    refetch: load,
    updateAssignments,
  };
}
