import React, {useEffect, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import {LiveBreak, LiveShift} from '../types/shifts';

type Props = {
  orgId: string;
};

const LiveShiftsPanel = ({orgId}: Props) => {
  const api = useApi();
  const [onShift, setOnShift] = useState<LiveShift[]>([]);
  const [onBreak, setOnBreak] = useState<LiveBreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLiveShifts(orgId);
      setOnShift((res as any)?.on_shift ?? []);
      setOnBreak((res as any)?.on_break ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load live shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(t);
  }, [orgId]);

  return (
    <Card>
      <div className="table__header">
        <div>
          <h2>Live shifts</h2>
          <p className="muted">Who is currently on shift and on break (auto-refreshing).</p>
        </div>
        <button className="secondary" type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>
      {loading ? (
        <LoadingState message="Loading live shifts..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="stack" style={{display: 'grid', gap: 12}}>
          <section>
            <h4>On shift now</h4>
            {onShift.length === 0 ? (
              <EmptyState message="No active shifts" />
            ) : (
              <div className="table">
                <div className="table__row table__head">
                  <div>Worker</div>
                  <div>Status</div>
                  <div>Started</div>
                  <div>Duration</div>
                  <div>Last receiver</div>
                </div>
                {onShift.map(s => (
                  <div className="table__row" key={s.id}>
                    <div>{s.user_id || s.profile_id}</div>
                    <div>{s.status}</div>
                    <div>{formatDateTime(s.start_time)}</div>
                    <div>{formatDuration(s.duration_seconds)}</div>
                    <div>{s.last_receiver_id || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4>On break</h4>
            {onBreak.length === 0 ? (
              <EmptyState message="No active breaks" />
            ) : (
              <div className="table">
                <div className="table__row table__head">
                  <div>Worker</div>
                  <div>Type</div>
                  <div>Started</div>
                  <div>Duration</div>
                </div>
                {onBreak.map(b => (
                  <div className="table__row" key={b.id}>
                    <div>{b.user_id || b.profile_id || '—'}</div>
                    <div>{b.type || '—'}</div>
                    <div>{formatDateTime(b.start_time)}</div>
                    <div>{formatDuration(b.duration_seconds)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
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

const formatDuration = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '—';
  const mins = Math.floor((seconds ?? 0) / 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
};

export default LiveShiftsPanel;
