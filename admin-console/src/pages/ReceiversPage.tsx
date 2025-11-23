import React, {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';

import Card from '../components/Card';
import {useApi} from '../api/client';
import Modal from '../components/Modal';
import ReceiverForm from '../components/ReceiverForm';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

type Receiver = {
  id: string;
  org_id?: string;
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
  const [orgOptions, setOrgOptions] = useState<{label: string; value: string}[]>([]);
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
          ? computeStatus(r) === 'Active'
          : computeStatus(r) !== 'Active';
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
              className="secondary"
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}>
              Clear filters
            </button>
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
              <div>Org</div>
              <div>Name</div>
              <div>Location</div>
              <div>Auth Mode</div>
              <div>Status</div>
              <div>Last Seen</div>
            </div>
            {filtered.map(r => (
              <div className="table__row" key={r.id}>
                <div>
                  <Link to={`/receivers/${r.id}`}>{r.id}</Link>
                </div>
                <div>{r.org_id || orgId || '�?"'}</div>
                <div>
                  <Link to={`/receivers/${r.id}`}>{r.displayName || '�?"'}</Link>
                </div>
                <div>{r.location || '�?"'}</div>
                <div>{r.authMode || '�?"'}</div>
                <div>
                  <span className="badge">{computeStatus(r)}</span>
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
          orgOptions={orgOptions}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async vals => {
            setCreateError(null);
            setCreating(true);
            try {
              const payload: any = {
                receiver_id: vals.receiver_id,
                display_name: vals.display_name,
                location_label: vals.location_label,
                org_id: vals.org_id || orgId,
                description: vals.description || undefined,
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
  if (!ts) return '�?"';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '�?"';
  return d.toLocaleString();
};

const computeStatus = (r: Receiver): 'Active' | 'Idle' | 'Offline' | 'Misconfigured' | 'Key expired' | 'Unknown' => {
  const raw = (r.status || '').toLowerCase();
  if (raw.includes('misconfig')) return 'Misconfigured';
  if (raw.includes('expired')) return 'Key expired';
  const last = r.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
  const now = Date.now();
  if (last && !Number.isNaN(last)) {
    if (now - last < 5 * 60 * 1000) return 'Active';
    if (now - last < 30 * 60 * 1000) return 'Idle';
    return 'Offline';
  }
  if (raw === 'online' || raw === 'active') return 'Active';
  if (raw === 'idle') return 'Idle';
  if (raw === 'offline') return 'Offline';
  return 'Unknown';
};

export default ReceiversPage;
