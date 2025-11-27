import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import type {AttendanceRecord, GroupOrSession} from '../types/attendance';
import {apiFetch} from '../api/client';

const ATTENDANCE_API_BASE = '/v2/orgs';

type AttendanceFilters = {
  from?: string;
  to?: string;
  groupId?: string;
};

export function useAttendance(filters?: AttendanceFilters & {refreshKey?: number}) {
  const {session} = useSession();
  const [data, setData] = useState<AttendanceRecord[]>([]);
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
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v && k !== 'refreshKey') params.set(k, String(v));
        });
        const json: any = await apiFetch(
          `${ATTENDANCE_API_BASE}/${encodeURIComponent(session.orgId)}/attendance${
            params.toString() ? `?${params.toString()}` : ''
          }`,
        );
        const raw = Array.isArray(json) ? json : json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load attendance');
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filters), session]);

  return {data, isLoading, error};
}

export function useGroups() {
  const {session} = useSession();
  const [data, setData] = useState<GroupOrSession[]>([]);
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
        const json: any = await apiFetch(`${ATTENDANCE_API_BASE}/${encodeURIComponent(session.orgId)}/groups`);
        const raw = Array.isArray(json) ? json : json?.data ?? [];
        if (!cancelled) setData(raw);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load groups');
        if (!cancelled) setData([]);
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
