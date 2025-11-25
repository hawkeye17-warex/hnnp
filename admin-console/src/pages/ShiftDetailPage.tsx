import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import {Shift, Break} from '../types/shifts';

const ShiftDetailPage = () => {
  const {id: orgId, shiftId} = useParams<{id: string; shiftId: string}>();
  const api = useApi();
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift | null>(null);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!orgId || !shiftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShift(orgId, shiftId);
      setShift(res?.shift ?? null);
      setBreaks(res?.breaks ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orgId, shiftId]);

  if (loading) {
    return (
      <div className="overview">
        <Card>
          <LoadingState message="Loading shift..." />
        </Card>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="overview">
        <Card>
          <ErrorState message={error ?? 'Failed to load shift'} onRetry={load} />
        </Card>
      </div>
    );
  }

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Shift</h2>
            <p className="muted">
              Profile: {shift.profile_id} | Status: <span className="badge">{shift.status}</span>
            </p>
            <p className="muted">
              {formatDateTime(shift.start_time)} → {formatDateTime(shift.end_time)} ({formatDuration(shift.total_seconds)})
            </p>
          </div>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h3>Breaks</h3>
        {breaks.length === 0 ? (
          <EmptyState message="No breaks recorded." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Start</div>
              <div>End</div>
              <div>Duration</div>
              <div>Type</div>
            </div>
            {breaks.map(b => (
              <div className="table__row" key={b.id}>
                <div>{formatDateTime(b.start_time)}</div>
                <div>{formatDateTime(b.end_time)}</div>
                <div>{formatDuration(b.total_seconds)}</div>
                <div>{b.type || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '—';
  const mins = Math.round(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
};

export default ShiftDetailPage;
