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

  const [endInput, setEndInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  const [breakForm, setBreakForm] = useState<{start_time: string; end_time: string; type: string; total_seconds: string}>({
    start_time: '',
    end_time: '',
    type: '',
    total_seconds: '',
  });
  const [editingBreak, setEditingBreak] = useState<string | null>(null);
  const [savingBreak, setSavingBreak] = useState(false);

  const load = async () => {
    if (!orgId || !shiftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShift(orgId, shiftId);
      setShift(res?.shift ?? null);
      setBreaks(res?.breaks ?? []);
      if (res?.shift) {
        setEndInput(res.shift.end_time ?? '');
        setStatusInput(res.shift.status ?? '');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orgId, shiftId]);

  const handleUpdateShift = async () => {
    if (!orgId || !shiftId) return;
    setSavingShift(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (endInput) payload.end_time = endInput;
      if (statusInput) payload.status = statusInput;
      await api.updateShift(orgId, shiftId, payload);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update shift');
    } finally {
      setSavingShift(false);
    }
  };

  const resetBreakForm = () => {
    setBreakForm({start_time: '', end_time: '', type: '', total_seconds: ''});
    setEditingBreak(null);
  };

  const handleSaveBreak = async () => {
    if (!orgId || !shiftId) return;
    setSavingBreak(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (breakForm.start_time) payload.start_time = breakForm.start_time;
      if (breakForm.end_time) payload.end_time = breakForm.end_time;
      if (breakForm.type) payload.type = breakForm.type;
      if (breakForm.total_seconds) payload.total_seconds = Number(breakForm.total_seconds);

      if (editingBreak) {
        await api.updateBreak(orgId, shiftId, editingBreak, payload);
      } else {
        await api.createBreak(orgId, shiftId, payload);
      }
      await load();
      resetBreakForm();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save break');
    } finally {
      setSavingBreak(false);
    }
  };

  const handleEditBreak = (b: Break) => {
    setEditingBreak(b.id);
    setBreakForm({
      start_time: b.start_time ?? '',
      end_time: b.end_time ?? '',
      type: b.type ?? '',
      total_seconds: b.total_seconds ? String(b.total_seconds) : '',
    });
  };

  const handleDeleteBreak = async (id: string) => {
    if (!orgId || !shiftId) return;
    setSavingBreak(true);
    setError(null);
    try {
      await api.deleteBreak(orgId, shiftId, id);
      await load();
      resetBreakForm();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete break');
    } finally {
      setSavingBreak(false);
    }
  };

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
              {formatDateTime(shift.start_time)} — {formatDateTime(shift.end_time)} ({formatDuration(shift.total_seconds)})
            </p>
            {(shift.edited_by || shift.edited_at) && (
              <p className="muted">
                Edited by {shift.edited_by ?? 'unknown'} at {formatDateTime(shift.edited_at ?? undefined)}
              </p>
            )}
          </div>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
        <div className="form">
          <div className="form__row">
            <label htmlFor="end-time">Adjust end time (ISO or yyyy-mm-ddThh:mm)</label>
            <input
              id="end-time"
              type="text"
              placeholder="2025-11-24T15:30:00Z"
              value={endInput}
              onChange={e => setEndInput(e.target.value)}
            />
          </div>
          <div className="form__row">
            <label htmlFor="status">Status</label>
            <input
              id="status"
              type="text"
              placeholder="running / closed / corrected"
              value={statusInput}
              onChange={e => setStatusInput(e.target.value)}
            />
          </div>
          <div className="actions">
            <button className="primary" type="button" disabled={savingShift} onClick={handleUpdateShift}>
              {savingShift ? 'Saving...' : 'Save shift changes'}
            </button>
            <button className="secondary" type="button" onClick={() => load()} disabled={savingShift}>
              Refresh
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <div>
            <h3>Breaks</h3>
            <p className="muted">
              Total break time: {formatDuration(sumBreaks(breaks))} | Paid: {formatDuration(sumBreaks(breaks, true))} | Unpaid:{' '}
              {formatDuration(sumBreaks(breaks, false))}
            </p>
          </div>
        </div>
        {breaks.length === 0 ? (
          <EmptyState message="No breaks recorded." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Start</div>
              <div>End</div>
              <div>Duration</div>
              <div>Type</div>
              <div />
            </div>
            {breaks.map(b => (
              <div className="table__row" key={b.id}>
                <div>{formatDateTime(b.start_time)}</div>
                <div>{formatDateTime(b.end_time)}</div>
                <div>{formatDuration(b.total_seconds)}</div>
                <div>{b.type || '—'}</div>
                <div className="table__actions">
                  <button className="link" type="button" onClick={() => handleEditBreak(b)}>
                    Edit
                  </button>
                  <button className="link danger" type="button" onClick={() => handleDeleteBreak(b.id)} disabled={savingBreak}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="divider" />

        <h4>{editingBreak ? 'Edit break' : 'Add break'}</h4>
        <div className="form">
          <div className="form__row">
            <label htmlFor="break-start">Start time</label>
            <input
              id="break-start"
              type="text"
              placeholder="2025-11-24T14:00:00Z"
              value={breakForm.start_time}
              onChange={e => setBreakForm({...breakForm, start_time: e.target.value})}
            />
          </div>
          <div className="form__row">
            <label htmlFor="break-end">End time</label>
            <input
              id="break-end"
              type="text"
              placeholder="2025-11-24T14:15:00Z"
              value={breakForm.end_time}
              onChange={e => setBreakForm({...breakForm, end_time: e.target.value})}
            />
          </div>
          <div className="form__row">
            <label htmlFor="break-type">Type</label>
            <input
              id="break-type"
              type="text"
              placeholder="paid / unpaid / meal"
              value={breakForm.type}
              onChange={e => setBreakForm({...breakForm, type: e.target.value})}
            />
          </div>
          <div className="form__row">
            <label htmlFor="break-duration">Total seconds (optional)</label>
            <input
              id="break-duration"
              type="number"
              min={0}
              value={breakForm.total_seconds}
              onChange={e => setBreakForm({...breakForm, total_seconds: e.target.value})}
            />
          </div>
          <div className="actions">
            <button className="primary" type="button" disabled={savingBreak} onClick={handleSaveBreak}>
              {savingBreak ? 'Saving...' : editingBreak ? 'Update break' : 'Add break'}
            </button>
            {editingBreak && (
              <button className="secondary" type="button" onClick={resetBreakForm} disabled={savingBreak}>
                Cancel
              </button>
            )}
          </div>
        </div>
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

const sumBreaks = (items: Break[], paid?: boolean) =>
  items
    .filter(b => {
      if (paid === undefined) return true;
      if (!b.type) return paid;
      const lower = b.type.toLowerCase();
      const isPaid = lower.includes('paid');
      return paid ? isPaid : !isPaid;
    })
    .reduce((sum, b) => sum + (b.total_seconds ?? 0), 0);

export default ShiftDetailPage;
