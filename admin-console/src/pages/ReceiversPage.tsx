import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import {useApi} from '../api/client';

type Receiver = {
  id: string;
  displayName?: string;
  location?: string;
  authMode?: string;
  status?: string;
  last_seen_at?: string;
};

const ReceiversPage = () => {
  const api = useApi();
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getReceivers();
        if (!mounted) return;
        setReceivers(Array.isArray(data) ? data : data?.data ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load receivers.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return receivers.filter(r => {
      const matchesText =
        !term ||
        r.id.toLowerCase().includes(term) ||
        (r.displayName ?? '').toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'online'
          ? r.status === 'online'
          : r.status && r.status !== 'online';
      return matchesText && matchesStatus;
    });
  }, [receivers, search, statusFilter]);

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Receivers</h2>
            {loading ? <span className="muted">Loading…</span> : null}
            {error ? <span className="form__error">{error}</span> : null}
          </div>
          <div className="actions">
            <input
              className="input"
              placeholder="Filter by ID or name"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <button
              className="primary"
              onClick={() => alert('New receiver modal coming soon')}>
              + New receiver
            </button>
          </div>
        </div>
        {loading ? (
          <div className="table__loading">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="table__empty">No receivers found.</div>
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Receiver ID</div>
              <div>Name</div>
              <div>Location</div>
              <div>Auth Mode</div>
              <div>Status</div>
              <div>Last Seen</div>
            </div>
            {filtered.map(r => (
              <div className="table__row" key={r.id}>
                <div>{r.id}</div>
                <div>{r.displayName || '—'}</div>
                <div>{r.location || '—'}</div>
                <div>{r.authMode || '—'}</div>
                <div>
                  <span className="badge">{r.status || 'unknown'}</span>
                </div>
                <div>{formatTime(r.last_seen_at)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const formatTime = (ts?: string) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

export default ReceiversPage;
