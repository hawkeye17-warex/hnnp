import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import {useSession} from '../hooks/useSession';
import {Shift, Break} from '../types/shifts';

const ShiftDetailPage = () => {
  const {id: orgId, shiftId} = useParams<{id: string; shiftId: string}>();
  const api = useApi();
  const navigate = useNavigate();
  const {session} = useSession();
  const canManageShifts = ['admin', 'superadmin', 'shift_manager'].includes(session?.role ?? 'admin');
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
  const [presence, setPresence] = useState<any[]>([]);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);

  const load = async () => {
    if (!orgId || !shiftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShift(orgId, shiftId);
      setShift(res?.shift ?? null);
      setBreaks(res?.breaks ?? []);
      if (res?.shift?.user_id) {
        void loadPresence(res.shift);
      }
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

  const loadPresence = async (s: Shift) => {
    if (!orgId) return;
    setPresenceLoading(true);
    setPresenceError(null);
    try {
      const from = s.start_time;
      const to = s.end_time ?? new Date().toISOString();
      const res = await api.getOrgPresence(orgId, {
        from,
        to,
        user_ref: (s as any)?.user_id || s.profile_id,
      });
      setPresence((res as any)?.events ?? []);
    } catch (err: any) {
      setPresenceError(err?.message ?? 'Failed to load presence logs');
    } finally {
      setPresenceLoading(false);
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
            <button className="primary" type="button" disabled={savingShift || !canManageShifts} onClick={handleUpdateShift}>
              {savingShift ? 'Saving...' : 'Save shift changes'}
            </button>
            <button className="secondary" type="button" onClick={() => load()} disabled={savingShift}>
              Refresh
            </button>
            {!canManageShifts && <span className="muted">Requires shift manager/admin</span>}
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
            <button className="primary" type="button" disabled={savingBreak || !canManageShifts} onClick={handleSaveBreak}>
              {savingBreak ? 'Saving...' : editingBreak ? 'Update break' : 'Add break'}
            </button>
            {editingBreak && (
              <button className="secondary" type="button" onClick={resetBreakForm} disabled={savingBreak}>
                Cancel
              </button>
            )}
            {!canManageShifts && <span className="muted">Requires shift manager/admin</span>}
          </div>
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <div>
            <h3>Presence during shift</h3>
            <p className="muted">Events for this worker within the shift window, with gap markers.</p>
          </div>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => shift && loadPresence(shift)} disabled={presenceLoading}>
              Refresh
            </button>
          </div>
        </div>
        {presenceLoading ? (
          <LoadingState message="Loading presence..." />
        ) : presenceError ? (
          <ErrorState message={presenceError} onRetry={() => shift && loadPresence(shift)} />
        ) : presence.length === 0 ? (
          <EmptyState message="No presence events in this window." />
        ) : (
          <>
            {renderGaps(shift, presence)}
            <div className="table">
              <div className="table__row table__head">
                <div>Time</div>
                <div>Receiver</div>
                <div>Result</div>
                <div>Token</div>
              </div>
              {presence.map(evt => (
                <div className="table__row" key={evt.id}>
                  <div>{formatDateTime(evt.server_timestamp)}</div>
                  <div>{evt.receiver_id}</div>
                  <div>{evt.auth_result}</div>
                  <div>{evt.token_prefix}</div>
                </div>
              ))}
            </div>
          </>
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

const renderGaps = (shift: Shift | null, events: any[]) => {
  if (!shift || events.length === 0) return null;
  const thresholdMs = 5 * 60 * 1000; // 5 minutes
  const sorted = [...events].sort(
    (a, b) => new Date(a.server_timestamp).getTime() - new Date(b.server_timestamp).getTime(),
  );
  const gaps: {from: Date; to: Date}[] = [];
  let prev = new Date(shift.start_time);
  sorted.forEach(evt => {
    const ts = new Date(evt.server_timestamp);
    if (ts.getTime() - prev.getTime() > thresholdMs) {
      gaps.push({from: prev, to: ts});
    }
    prev = ts;
  });
  const shiftEnd = shift.end_time ? new Date(shift.end_time) : null;
  if (shiftEnd && shiftEnd.getTime() - prev.getTime() > thresholdMs) {
    gaps.push({from: prev, to: shiftEnd});
  }
  if (gaps.length === 0) return null;
  return (
    <div className="card" style={{marginBottom: 12, padding: 8, background: '#fff8e1'}}>
      <strong>Presence gaps detected:</strong>
      <ul>
        {gaps.map((g, idx) => (
          <li key={idx}>
            {formatDateTime(g.from.toISOString())} → {formatDateTime(g.to.toISOString())} ({formatDuration(Math.floor((g.to.getTime() - g.from.getTime()) / 1000))})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShiftDetailPage;
