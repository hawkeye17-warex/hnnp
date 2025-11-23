import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import {useApi} from '../api/client';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

type PresenceEvent = {
  id: string;
  timestamp?: string;
  occurredAt?: string;
  createdAt?: string;
  userRef?: string;
  receiverName?: string;
  receiverId?: string;
  status?: string;
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
  const [receiverId, setReceiverId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

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
      const data = await api.getReceivers(orgId);
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
      if (receiverId) params.receiverId = receiverId;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.getPresenceEvents(params, orgId);
      setEvents(normalizeArray<PresenceEvent>(res));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivers();
  }, [orgId]);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, orgId]);

  useEffect(() => {
    setPage(1);
  }, [orgId]);

  const tableEvents = useMemo(() => events ?? [], [events]);

  const applyFilters = () => {
    setPage(1);
    loadEvents();
  };

  return (
    <div className="overview">
      <Card>
        <div className="filters">
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
          <button className="primary" onClick={applyFilters} disabled={loading}>
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
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
          <EmptyState message="No events found." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Time</div>
              <div>User ref</div>
              <div>Receiver</div>
              <div>Status</div>
            </div>
            {tableEvents.map(ev => (
              <div className="table__row" key={ev.id}>
                <div>{formatTime(ev)}</div>
                <div>{ev.userRef || '—'}</div>
                <div>{ev.receiverName || ev.receiverId || '—'}</div>
                <div>
                  <span className="badge">{ev.status || 'unknown'}</span>
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
          <button className="secondary" onClick={() => setPage(p => p + 1)} disabled={loading}>
            Next
          </button>
        </div>
      </Card>
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
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

export default PresencePage;
