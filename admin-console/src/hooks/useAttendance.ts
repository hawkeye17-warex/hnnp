import {useEffect, useState} from 'react';
import type {AttendanceRecord, GroupOrSession} from '../types/attendance';
import {useSession} from './useSession';

const ATTENDANCE_API_BASE = '/v2/orgs';

type AttendanceFilters = {
  from?: string;
  to?: string;
  groupId?: string;
};

export function useAttendance(filters?: AttendanceFilters) {
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
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        if (!baseUrl) throw new Error('Missing backend base URL');
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v) params.set(k, String(v));
        });
        const res = await fetch(
          `${baseUrl}${ATTENDANCE_API_BASE}/${encodeURIComponent(session.orgId)}/attendance${
            params.toString() ? `?${params.toString()}` : ''
          }`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-hnnp-api-key': session.apiKey,
            },
          },
        );
        if (!res.ok) throw new Error(`Failed to fetch attendance (${res.status})`);
        const text = await res.text();
        let json: any = [];
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Received non-JSON response');
        }
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
  }, [JSON.stringify(filters)]);

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
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        if (!baseUrl) throw new Error('Missing backend base URL');
        // TODO: replace with real endpoint once available
        const res = await fetch(
          `${baseUrl}${ATTENDANCE_API_BASE}/${encodeURIComponent(session.orgId)}/groups`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-hnnp-api-key': session.apiKey,
            },
          },
        );
        if (!res.ok) throw new Error(`Failed to fetch groups (${res.status})`);
        const text = await res.text();
        let json: any = [];
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('Received non-JSON response');
        }
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
  }, []);

  return {data, isLoading, error};
}
