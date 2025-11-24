import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type Profile = {
  id: string;
  user_id: string;
  org_id: string;
  type: string;
  capabilities: string[];
  created_at?: string;
};

type Props = {
  orgId: string;
};

const UserProfilesTab = ({orgId}: Props) => {
  const api = useApi();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrgProfiles(orgId, search.trim() || undefined);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setProfiles(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load user profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter(p => p.user_id.toLowerCase().includes(term) || (p.type ?? '').toLowerCase().includes(term));
  }, [profiles, search]);

  return (
    <Card>
      <div className="table__header">
        <div>
          <h2>User Profiles</h2>
          <p className="muted">Profiles for this org. Search by user email/ID or profile type.</p>
        </div>
        <div className="actions" style={{gap: 8}}>
          <input
            className="input"
            placeholder="Search by user or type"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="secondary" type="button" onClick={() => setSearch('')}>
            Clear
          </button>
          <button className="primary" type="button" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading profiles..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No profiles found." />
      ) : (
        <div className="table">
          <div className="table__row table__head">
            <div>User</div>
            <div>Type</div>
            <div>Capabilities</div>
            <div>Created</div>
          </div>
          {filtered.map(p => (
            <div className="table__row" key={p.id}>
              <div>{p.user_id}</div>
              <div>{p.type}</div>
              <div>{(p.capabilities || []).join(', ') || '—'}</div>
              <div className="muted">{formatDate(p.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default UserProfilesTab;
