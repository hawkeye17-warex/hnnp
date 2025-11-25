import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import {Shift} from '../types/shifts';

type Props = {orgId: string};

const ShiftsTab = ({orgId}: Props) => {
  const api = useApi();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (profile) params.profile_id = profile;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.getShifts(orgId, params);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setShifts(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load shifts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orgId]);

  const filtered = useMemo(() => {
    // server filters already applied; keep client filter minimal
    return shifts;
  }, [shifts]);

  return (
    <Card>
      <div className="table__header">
        <div>
          <h2>Shifts</h2>
          <p className="muted">Worker shifts for this org.</p>
        </div>
        <div className="actions" style={{gap: 8}}>
          <input
            className="input"
            placeholder="Profile ID filter"
            value={profile}
            onChange={e => setProfile(e.target.value)}
          />
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setProfile('');
              setStatus('');
              setFrom('');
              setTo('');
            }}>
            Clear
          </button>
          <button className="primary" type="button" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading shifts..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No shifts found." />
      ) : (
        <div className="table">
          <div className="table__row table__head">
            <div>Profile</div>
            <div>Date</div>
            <div>Start</div>
            <div>End</div>
            <div>Duration</div>
            <div>Status</div>
          </div>
          {filtered.map(s => (
            <div className="table__row" key={s.id}>
              <div>{s.profile_id}</div>
              <div>{formatDateOnly(s.start_time)}</div>
              <div className="muted">{formatDateTime(s.start_time)}</div>
              <div className="muted">{formatDateTime(s.end_time)}</div>
              <div>{formatDuration(s.total_seconds)}</div>
              <div>
                <span className="badge">{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};
const formatDateOnly = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};
const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '—';
  const mins = Math.round(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
};

export default ShiftsTab;
