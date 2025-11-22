import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import {useApi} from '../api/client';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

type Link = {
  id: string;
  userRef?: string;
  deviceId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

const LinksPage = () => {
  const api = useApi();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRefFilter, setUserRefFilter] = useState('');

  const [newUserRef, setNewUserRef] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalizeLinks = (payload: any): Link[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.links)) return payload.links;
    return [];
  };

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLinks(userRefFilter ? {userRef: userRefFilter} : {});
      setLinks(normalizeLinks(res));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => (Array.isArray(links) ? links : []), [links]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createLink({userRef: newUserRef, deviceId: newDeviceId});
      setNewUserRef('');
      setNewDeviceId('');
      await loadLinks();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'activate' | 'revoke') => {
    setLoading(true);
    setError(null);
    try {
      if (action === 'activate') {
        await api.activateLink(id);
      } else {
        await api.revokeLink(id);
      }
      await loadLinks();
    } catch (err: any) {
      setError(err?.message ?? `Failed to ${action} link`);
      setLoading(false);
    }
  };

  return (
    <div className="overview">
      <Card>
        <div className="filters">
          <input
            className="input"
            placeholder="Filter by user ref"
            value={userRefFilter}
            onChange={e => setUserRefFilter(e.target.value)}
          />
          <button className="primary" onClick={loadLinks} disabled={loading}>
            {loading ? 'Loading…' : 'Apply filter'}
          </button>
        </div>
      </Card>

      <Card>
        <h3>Create new link</h3>
        <div className="form__row">
          <label className="form__field">
            <span>User ref</span>
            <input
              className="input"
              value={newUserRef}
              onChange={e => setNewUserRef(e.target.value)}
              placeholder="user_123"
            />
          </label>
          <label className="form__field">
            <span>Device ID</span>
            <input
              className="input"
              value={newDeviceId}
              onChange={e => setNewDeviceId(e.target.value)}
              placeholder="device_abc"
            />
          </label>
          <button className="primary" onClick={handleCreate} disabled={submitting || loading}>
            {submitting ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <h2>Links</h2>
        </div>
        {loading ? (
          <LoadingState message="Loading links..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadLinks} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No links found." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Link ID</div>
              <div>User ref</div>
              <div>Device ID</div>
              <div>Status</div>
              <div>Created</div>
              <div>Updated</div>
              <div>Actions</div>
            </div>
            {filtered.map(link => (
              <div className="table__row" key={link.id} style={{gridTemplateColumns: '1fr 1fr 1fr 0.8fr 1fr 1fr 1fr'}}>
                <div>{link.id}</div>
                <div>{link.userRef || '—'}</div>
                <div>{link.deviceId || '—'}</div>
                <div>
                  <span className="badge">{link.status || 'unknown'}</span>
                </div>
                <div>{formatTime(link.createdAt)}</div>
                <div>{formatTime(link.updatedAt)}</div>
                <div className="actions">
                  {link.status !== 'active' ? (
                    <button className="secondary" onClick={() => handleAction(link.id, 'activate')}>
                      Activate
                    </button>
                  ) : null}
                  {link.status !== 'revoked' ? (
                    <button className="secondary" onClick={() => handleAction(link.id, 'revoke')}>
                      Revoke
                    </button>
                  ) : null}
                </div>
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

export default LinksPage;
