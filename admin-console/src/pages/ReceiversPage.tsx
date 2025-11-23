import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import {useApi} from '../api/client';
import Modal from '../components/Modal';
import ReceiverForm from '../components/ReceiverForm';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

type Receiver = {
  id: string;
  displayName?: string;
  location?: string;
  authMode?: string;
  status?: string;
  last_seen_at?: string;
};

type Props = {orgId?: string};

const ReceiversPage = ({orgId}: Props) => {
  const api = useApi();
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadReceivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReceivers(orgId);
      setReceivers(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load receivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivers();
  }, [orgId]);

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
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}>
              + New receiver
            </button>
          </div>
        </div>
        {loading ? (
          <LoadingState message="Loading receivers..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadReceivers} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No receivers found." />
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
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New receiver">
        <ReceiverForm
          loading={creating}
          error={createError ?? undefined}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async vals => {
            setCreateError(null);
            setCreating(true);
            try {
              const payload: any = {
                receiver_id: vals.receiver_id,
                display_name: vals.display_name,
                location_label: vals.location_label,
                auth_mode: vals.auth_mode,
              };
              if (vals.latitude) payload.latitude = Number(vals.latitude);
              if (vals.longitude) payload.longitude = Number(vals.longitude);
              if (vals.auth_mode === 'hmac_shared_secret') {
                payload.shared_secret = vals.shared_secret;
              } else {
                payload.public_key_pem = vals.public_key_pem;
              }
              await api.createReceiver(payload, orgId);
              setCreateOpen(false);
              setCreating(false);
              await loadReceivers();
            } catch (err: any) {
              setCreateError(err?.message ?? 'Failed to create receiver.');
              setCreating(false);
            }
          }}
        />
      </Modal>
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
