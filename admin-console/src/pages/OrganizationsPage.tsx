import React, {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import {useApi} from '../api/client';

type OrgRow = {
  org_id: string;
  name?: string;
  slug?: string;
  status?: string;
  created_at?: string;
  key_prefixes?: string[];
};

const OrganizationsPage = () => {
  const api = useApi();
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrganizations(true);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setOrganizations(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrgs();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter(org => {
      return (
        (org.name ?? '').toLowerCase().includes(term) ||
        (org.slug ?? '').toLowerCase().includes(term) ||
        org.org_id.toLowerCase().includes(term)
      );
    });
  }, [organizations, search]);

  const exportCsv = () => {
    const headers = ['org_id', 'name', 'slug', 'status', 'created_at', 'key_prefixes'];
    const rows = filtered.map(org => [
      org.org_id,
      org.name ?? '',
      org.slug ?? '',
      org.status ?? '',
      org.created_at ?? '',
      (org.key_prefixes ?? []).join('|'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join(
      '\n',
    );
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (loading) return <LoadingState message="Loading organizations..." />;
    if (error) return <ErrorState message={error} onRetry={loadOrgs} />;
    if (filtered.length === 0) return <EmptyState message="No organizations found." />;

    return (
      <div className="table">
        <div className="table__row table__head">
          <div>Name</div>
          <div>Slug</div>
          <div>Org ID</div>
          <div>Created</div>
          <div>Key prefixes</div>
        </div>
        {filtered.map(org => (
          <div className="table__row" key={org.org_id}>
            <div>
              <Link to={`/organizations/${org.org_id}`}>{org.name || 'Untitled org'}</Link>
            </div>
            <div>{org.slug || '—'}</div>
            <div className="muted">{org.org_id}</div>
            <div>{formatDate(org.created_at)}</div>
            <div className="muted">{(org.key_prefixes ?? []).join(', ') || '—'}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Organizations</h2>
            <p className="muted">View orgs and their key prefixes.</p>
          </div>
          <div className="actions" style={{gap: 8}}>
            <input
              className="input"
              placeholder="Search by name, slug, or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="secondary" type="button" onClick={() => setSearch('')}>
              Clear
            </button>
            <button className="secondary" type="button" onClick={loadOrgs}>
              Refresh
            </button>
            <button className="primary" type="button" onClick={exportCsv}>
              Export CSV
            </button>
            <Link className="secondary" to="/admin/onboard-org">
              Onboard org
            </Link>
          </div>
        </div>
        {renderTable()}
      </Card>
    </div>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default OrganizationsPage;
