import {useEffect, useState} from 'react';
import type {AttendanceRecord, GroupOrSession} from '../types/attendance';

const ATTENDANCE_API_BASE = '/api/attendance';

type AttendanceFilters = {
  from?: string;
  to?: string;
  groupId?: string;
};

export function useAttendance(filters?: AttendanceFilters) {
  const [data, setData] = useState<AttendanceRecord[]>([]);
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
        const res = await fetch(`${ATTENDANCE_API_BASE}${query ? `?${query}` : ''}`);
        if (!res.ok) throw new Error(`Failed to fetch attendance (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
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
  }, [JSON.stringify(filters)]);

  return {data, isLoading, error};
}

export function useGroups() {
  const [data, setData] = useState<GroupOrSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: replace with real endpoint once available
        const res = await fetch(`${ATTENDANCE_API_BASE}/groups`);
        if (!res.ok) throw new Error(`Failed to fetch groups (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(Array.isArray(json) ? json : json?.data ?? []);
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
  }, []);

  return {data, isLoading, error};
}
