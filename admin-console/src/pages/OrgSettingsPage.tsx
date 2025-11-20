import React, {useEffect, useState} from 'react';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import {useApi} from '../api/client';

const OrgSettingsPage = () => {
  const api = useApi();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getOrg();
        if (mounted) setOrg(data);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load org');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api]);

  return (
    <div className="overview">
      <Card>
        <h2>Organization</h2>
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : null}
        {org ? (
          <div className="org-grid">
            <div>
              <p className="muted">Org ID</p>
              <p>{org.id ?? '—'}</p>
            </div>
            <div>
              <p className="muted">Name</p>
              <p>{org.name ?? '—'}</p>
            </div>
            <div>
              <p className="muted">Slug</p>
              <p>{org.slug ?? '—'}</p>
            </div>
            <div>
              <p className="muted">Status</p>
              <p>{org.status ?? '—'}</p>
            </div>
            <div>
              <p className="muted">Created</p>
              <p>{formatTime(org.created_at || org.createdAt)}</p>
            </div>
            <div>
              <p className="muted">Updated</p>
              <p>{formatTime(org.updated_at || org.updatedAt)}</p>
            </div>
          </div>
        ) : !loading && !error ? (
          <EmptyState message="No org info available." />
        ) : null}
      </Card>
      <Card>
        <h3>Config (read-only)</h3>
        <p className="muted">
          Config updates are read-only in v1. Please contact backend or use future admin features for
          changes.
        </p>
        <pre className="code-block">
          {org?.config ? JSON.stringify(org.config, null, 2) : 'No config available.'}
        </pre>
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

export default OrgSettingsPage;
