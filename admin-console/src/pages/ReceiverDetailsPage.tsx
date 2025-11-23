import React, {useEffect, useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type Receiver = {
  id: string;
  org_id?: string;
  displayName?: string;
  location?: string;
  status?: string;
  last_seen_at?: string;
  description?: string;
};

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

const ReceiverDetailsPage = () => {
  const {id} = useParams<{id: string}>();
  const api = useApi();
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'logs' | 'status' | 'advanced'>('overview');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api.getReceivers();
      const arr = Array.isArray(list) ? list : (list as any)?.data ?? [];
      const found = arr.find((r: any) => String(r.id) === String(id));
      setReceiver(found ?? null);
      const logs = await api.getPresenceEvents({receiverId: id, limit: 50, sort: 'desc'});
      const logsArr = Array.isArray(logs)
        ? logs
        : Array.isArray((logs as any)?.events)
        ? (logs as any).events
        : Array.isArray((logs as any)?.data)
        ? (logs as any).data
        : [];
      setEvents(logsArr);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load receiver.');
      setReceiver(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const {health, lastSeenDisplay, errorCount} = useMemo(() => {
    const last = receiver?.last_seen_at ? new Date(receiver.last_seen_at) : null;
    const now = Date.now();
    const online =
      receiver?.status === 'online' ||
      receiver?.status === 'active' ||
      (last && !Number.isNaN(last.getTime()) && now - last.getTime() < 20 * 60 * 1000);
    const errs = events.filter(ev => (ev.status || '').toLowerCase() === 'error' || (ev.status || '').toLowerCase() === 'failed').length;
    return {
      health: online ? 'Healthy' : 'Unreachable',
      lastSeenDisplay: last && !Number.isNaN(last.getTime()) ? last.toLocaleString() : '�?"',
      errorCount: errs,
    };
  }, [receiver, events]);

  if (loading) {
    return (
      <div className="overview">
        <Card>
          <LoadingState message="Loading receiver..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview">
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      </div>
    );
  }

  if (!receiver) {
    return (
      <div className="overview">
        <Card>
          <EmptyState message="Receiver not found." />
        </Card>
      </div>
    );
  }

  const totalEvents = events.length;

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>{receiver.displayName || receiver.id}</h2>
            <p className="muted">Receiver ID: {receiver.id}</p>
            <p className="muted">Org: {receiver.org_id || '�?"'}</p>
          </div>
        </div>
        <div style={{display: 'flex', gap: 8}}>
          <button className={tab === 'overview' ? 'primary' : 'secondary'} onClick={() => setTab('overview')}>
            Overview
          </button>
          <button className={tab === 'logs' ? 'primary' : 'secondary'} onClick={() => setTab('logs')}>
            Logs
          </button>
          <button className={tab === 'status' ? 'primary' : 'secondary'} onClick={() => setTab('status')}>
            Status
          </button>
          <button className={tab === 'advanced' ? 'primary' : 'secondary'} onClick={() => setTab('advanced')}>
            Advanced
          </button>
        </div>
      </Card>

      {tab === 'overview' ? (
        <Card>
          <div className="card-grid metrics-grid">
            <div>
              <p className="muted">Health</p>
              <h3>{health}</h3>
              <p className="muted">Status: {receiver.status || '�?"'}</p>
            </div>
            <div>
              <p className="muted">Last seen</p>
              <h3>{lastSeenDisplay}</h3>
            </div>
            <div>
              <p className="muted">Total events (last 50)</p>
              <h3>{totalEvents}</h3>
            </div>
            <div>
              <p className="muted">Error count</p>
              <h3>{errorCount}</h3>
            </div>
          </div>
          <div style={{marginTop: 12}}>
            <p className="muted">Location</p>
            <p>{receiver.location || '�?"'}</p>
            <p className="muted" style={{marginTop: 8}}>
              Description
            </p>
            <p>{receiver.description || '�?"'}</p>
          </div>
        </Card>
      ) : null}

      {tab === 'logs' ? (
        <Card>
          <div className="table__header">
            <h3>Recent presence events</h3>
          </div>
          {events.length === 0 ? (
            <EmptyState message="No recent events for this receiver." />
          ) : (
            <div className="table">
              <div className="table__row table__head">
                <div>Time</div>
                <div>User</div>
                <div>Status</div>
              </div>
              {events.map(ev => (
                <div className="table__row" key={ev.id}>
                  <div>{formatTime(ev)}</div>
                  <div>{ev.userRef || '�?"'}</div>
                  <div>
                    <span className="badge">{ev.status || 'unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'status' ? (
        <Card>
          <h3>Status</h3>
          <p className="muted">Current status: {receiver.status || '�?"'}</p>
          <p className="muted">Last seen: {lastSeenDisplay}</p>
          <p className="muted">Health: {health}</p>
        </Card>
      ) : null}

      {tab === 'advanced' ? (
        <Card>
          <h3>Advanced</h3>
          <pre className="code-block">{JSON.stringify(receiver, null, 2)}</pre>
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

export default ReceiverDetailsPage;
