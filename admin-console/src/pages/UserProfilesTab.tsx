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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [formUser, setFormUser] = useState('');
  const [formType, setFormType] = useState('');
  const [formCaps, setFormCaps] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

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
          <button
            className="primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setFormUser('');
              setFormType('');
              setFormCaps('');
              setFormErr(null);
              setFormOpen(true);
            }}>
            + New profile
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
              <div className="table__actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setEditing(p);
                    setFormUser(p.user_id);
                    setFormType(p.type);
                    setFormCaps((p.capabilities || []).join(', '));
                    setFormErr(null);
                    setFormOpen(true);
                  }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="card" style={{marginTop: 12}}>
          <h4>{editing ? 'Edit profile' : 'New profile'}</h4>
          <div className="form">
            <label className="form__field">
              <span>User email / ID</span>
              <input
                value={formUser}
                onChange={e => setFormUser(e.target.value)}
                disabled={!!editing}
                placeholder="user@example.com"
              />
            </label>
            <label className="form__field">
              <span>Profile type</span>
              <input value={formType} onChange={e => setFormType(e.target.value)} placeholder="admin, auditor, etc." />
            </label>
            <label className="form__field">
              <span>Capabilities (comma-separated)</span>
              <input
                value={formCaps}
                onChange={e => setFormCaps(e.target.value)}
                placeholder="read,write,manage_receivers"
              />
            </label>
            {formErr ? <div className="form__error">{formErr}</div> : null}
            <div style={{display: 'flex', gap: 8}}>
              <button className="primary" type="button" disabled={saving} onClick={async () => {
                setSaving(true);
                setFormErr(null);
                const caps = formCaps
                  .split(',')
                  .map(c => c.trim())
                  .filter(Boolean);
                try {
                  if (editing) {
                    await api.updateOrgProfile(orgId, editing.id, {
                      type: formType,
                      capabilities: caps,
                    });
                  } else {
                    await api.createOrgProfile(orgId, {
                      user_id: formUser,
                      type: formType,
                      capabilities: caps,
                    });
                  }
                  setFormOpen(false);
                  await load();
                } catch (err: any) {
                  setFormErr(err?.message ?? 'Failed to save profile.');
                } finally {
                  setSaving(false);
                }
              }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="secondary" type="button" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
