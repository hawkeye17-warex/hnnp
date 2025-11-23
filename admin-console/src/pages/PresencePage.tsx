import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import {useApi} from '../api/client';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

type PresenceEvent = {
  id: string;
  timestamp?: string;
  occurredAt?: string;
  createdAt?: string;
  userRef?: string;
  receiverName?: string;
  receiverId?: string;
  status?: string;
  token?: string;
  token_prefix?: string;
  raw?: any;
  signature_valid?: boolean;
  validation_status?: string;
};

type Receiver = {id: string; displayName?: string};

type Props = {orgId?: string};

const PresencePage = ({orgId}: Props) => {
  const api = useApi();
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userRef, setUserRef] = useState('');
  const [userId, setUserId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState<string>(orgId ?? '');
  const [orgOptions, setOrgOptions] = useState<{label: string; value: string}[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selected, setSelected] = useState<PresenceEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const normalizeArray = <T,>(payload: any): T[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.events)) return payload.events;
    return [];
  };

  const loadReceivers = async () => {
    try {
      const data = await api.getReceivers(orgFilter || orgId);
      setReceivers(normalizeArray<Receiver>(data));
    } catch {
      // ignore receiver load errors for filters
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {page, limit, sort: 'desc'};
      if (userRef) params.userRef = userRef;
      if (userId) params.userId = userId;
      if (receiverId) params.receiverId = receiverId;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.getPresenceEvents(params, orgFilter || orgId);
      setEvents(normalizeArray<PresenceEvent>(res));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load events. Check API key/permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivers();
    if (!orgId) {
      const loadOrgs = async () => {
        try {
          const data = await api.getOrganizations();
          const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
          setOrgOptions(list.map((o: any) => ({label: o.name ?? o.id, value: String(o.id)})));
        } catch {
          setOrgOptions([]);
        }
      };
      loadOrgs();
    } else {
      setOrgOptions([]);
      setOrgFilter(orgId);
    }
  }, [orgId]);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    setOrgFilter(orgId ?? '');
  }, [orgId]);

  const tableEvents = useMemo(() => events ?? [], [events]);
  const dailyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tableEvents.forEach(ev => {
      const d = formatDateKey(ev);
      counts[d] = (counts[d] ?? 0) + 1;
    });
    return counts;
  }, [tableEvents]);

  const hourCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tableEvents.forEach(ev => {
      const h = formatHour(ev);
      counts[h] = (counts[h] ?? 0) + 1;
    });
    return counts;
  }, [tableEvents]);

  const applyFilters = () => {
    setPage(1);
    loadEvents();
  };

const clearFilters = () => {
  setFromDate('');
  setToDate('');
  setUserRef('');
  setUserId('');
  setReceiverId('');
  setStatusFilter('all');
  setPage(1);
  loadEvents();
};

  return (
    <div className="overview">
      <Card>
        <div className="filters">
          {!orgId && (
            <select
              className="input"
              value={orgFilter}
              onChange={e => setOrgFilter(e.target.value)}>
              <option value="">All orgs</option>
              {orgOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            placeholder="From date"
          />
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            placeholder="To date"
          />
          <input
            className="input"
            placeholder="User ref"
            value={userRef}
            onChange={e => setUserRef(e.target.value)}
          />
          <input
            className="input"
            placeholder="User ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />
          <select
            className="input"
            value={receiverId}
            onChange={e => setReceiverId(e.target.value)}>
            <option value="">All receivers</option>
            {(Array.isArray(receivers) ? receivers : []).map(r => (
              <option key={r.id} value={r.id}>
                {r.displayName || r.id}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
            <option value="error">Error</option>
            <option value="unknown">Unknown</option>
            <option value="replay">Replay</option>
            <option value="out-of-window">Out of window</option>
            <option value="wrong-prefix">Wrong prefix</option>
          </select>
          <button className="primary" onClick={applyFilters} disabled={loading}>
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
          <button className="secondary" type="button" onClick={clearFilters} disabled={loading}>
            Clear filters
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => exportCsv(tableEvents)}
            disabled={tableEvents.length === 0 || loading}>
            Export CSV
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => exportJson(tableEvents)}
            disabled={tableEvents.length === 0 || loading}>
            Export JSON
          </button>
        </div>
        <div className="muted" style={{fontSize: 12}}>
          Dates use your browser timezone; adjust if you expect UTC ranges.
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <h2>Presence events</h2>
        </div>
        {loading ? (
          <LoadingState message="Loading presence events..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadEvents} />
        ) : tableEvents.length === 0 ? (
          <EmptyState message="No events found. Try adjusting filters." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Time</div>
              <div>User ref</div>
              <div>Receiver</div>
              <div>Status</div>
              <div>Validation</div>
              <div>Details</div>
            </div>
            {tableEvents.map(ev => (
              <div className="table__row" key={ev.id}>
                <div>{formatTime(ev)}</div>
                <div>{ev.userRef || '�?"'}</div>
                <div>{ev.receiverName || ev.receiverId || '�?"'}</div>
                <div>
                  <span className="badge">{ev.status || 'unknown'}</span>
                </div>
                <div>
                  <span className="badge">{getValidationLabel(ev)}</span>
                </div>
                <div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSelected(ev);
                      setDetailOpen(true);
                    }}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pagination">
          <button
            className="secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}>
            Previous
          </button>
          <span className="muted">Page {page}</span>
          <button
            className="secondary"
            onClick={() => setPage(p => p + 1)}
            disabled={loading || tableEvents.length < limit}>
            Next
          </button>
        </div>
      </Card>
      {selected ? (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Presence event details">
          <div style={{display: 'grid', gap: 8}}>
            <div>
              <p className="muted">Token prefix</p>
              <p>{(selected as any).token_prefix ?? '�?"'}</p>
            </div>
            <div>
              <p className="muted">Validity</p>
              <p>{getValidationLabel(selected)}</p>
            </div>
            <div>
              <p className="muted">Signature check</p>
              <p>{(selected as any).signature_valid === false ? 'Invalid' : 'Valid/unknown'}</p>
            </div>
            <div>
              <p className="muted">Decoded token</p>
              <pre className="code-block">
                {selected.token ? selected.token : (selected as any).token_body ?? '�?"'}
              </pre>
            </div>
            <div>
              <p className="muted">Raw payload</p>
              <pre className="code-block">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      ) : null}

      {tableEvents.length > 0 ? (
        <Card>
          <h3>Daily presence (current results)</h3>
          <div className="table">
            <div className="table__row table__head">
              <div>Date</div>
              <div>Count</div>
            </div>
            {Object.entries(dailyCounts)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([day, count]) => (
                <div className="table__row" key={day}>
                  <div>{day}</div>
                  <div>{count}</div>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      {tableEvents.length > 0 ? (
        <Card>
          <h3>Heatmap by hour (current results)</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8}}>
            {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(hour => (
              <div
                key={hour}
                style={{
                  padding: 8,
                  background: '#f3f4f6',
                  borderRadius: 6,
                  textAlign: 'center',
                }}>
                <div className="muted">{hour}:00</div>
                <div style={{fontWeight: 600}}>{hourCounts[hour] ?? 0}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};

const formatTime = (ev: PresenceEvent) => {
  const ts =
    ev.timestamp ||
    ev.occurredAt ||
    ev.createdAt ||
    (ev as any).time ||
    (ev as any).at;
  if (!ts) return '�?"';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '�?"';
  return d.toLocaleString();
};

const getValidationLabel = (ev: PresenceEvent): string => {
  const val = ((ev as any).validation_status || ev.status || '').toLowerCase();
  if (val.includes('replay')) return 'Replay';
  if (val.includes('out') && val.includes('window')) return 'Out-of-window';
  if (val.includes('wrong') && val.includes('prefix')) return 'Wrong-prefix';
  if (val.includes('invalid')) return 'Invalid';
  if (val.includes('fail')) return 'Failed';
  if (val.includes('verify') || val.includes('valid')) return 'Valid';
  return val || 'Unknown';
};

const exportCsv = (data: PresenceEvent[]) => {
  const header = ['id', 'timestamp', 'user_ref', 'receiver', 'status', 'validation_status'];
  const lines = [header.join(',')];
  data.forEach(ev => {
    const row = [
      ev.id,
      formatTime(ev),
      ev.userRef ?? '',
      ev.receiverName || ev.receiverId || '',
      ev.status ?? '',
      (ev as any).validation_status ?? '',
    ]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
    lines.push(row);
  });
  const blob = new Blob([lines.join('\n')], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'presence_logs.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const exportJson = (data: PresenceEvent[]) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'presence_logs.json';
  a.click();
  URL.revokeObjectURL(url);
};

const formatDateKey = (ev: PresenceEvent) => {
  const ts =
    ev.timestamp ||
    ev.occurredAt ||
    ev.createdAt ||
    (ev as any).time ||
    (ev as any).at;
  if (!ts) return 'Unknown';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toISOString().slice(0, 10);
};

const formatHour = (ev: PresenceEvent) => {
  const ts =
    ev.timestamp ||
    ev.occurredAt ||
    ev.createdAt ||
    (ev as any).time ||
    (ev as any).at;
  if (!ts) return '??';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '??';
  return String(d.getHours()).padStart(2, '0');
};

export default PresencePage;
