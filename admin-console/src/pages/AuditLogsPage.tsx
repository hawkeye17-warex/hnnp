import React, {useEffect, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type AuditRow = {
  id: string;
  org_id?: string;
  actor_key?: string;
  actor_role?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: any;
  created_at?: string;
};

const AuditLogsPage = () => {
  const api = useApi();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({orgId: '', action: '', entityType: ''});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.orgId) params.org_id = filters.orgId;
      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entity_type = filters.entityType;
      const res = await api.getAuditLogs(params);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setRows(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Audit Logs</h2>
            <p className="muted">Key rotations, CRUD actions, receiver and org changes.</p>
          </div>
          <div className="actions" style={{gap: 8}}>
            <input
              className="input"
              placeholder="Org ID filter"
              value={filters.orgId}
              onChange={e => setFilters({...filters, orgId: e.target.value})}
            />
            <input
              className="input"
              placeholder="Action filter"
              value={filters.action}
              onChange={e => setFilters({...filters, action: e.target.value})}
            />
            <input
              className="input"
              placeholder="Entity type filter"
              value={filters.entityType}
              onChange={e => setFilters({...filters, entityType: e.target.value})}
            />
            <button className="secondary" type="button" onClick={() => setFilters({orgId: '', action: '', entityType: ''})}>
              Clear
            </button>
            <button className="primary" type="button" onClick={load}>
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <LoadingState message="Loading audit logs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState message="No audit logs found." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Time</div>
              <div>Action</div>
              <div>Entity</div>
              <div>Actor</div>
              <div>Org</div>
              <div>Details</div>
            </div>
            {rows.map(r => (
              <div className="table__row" key={r.id}>
                <div className="muted">{formatDate(r.created_at)}</div>
                <div>{r.action}</div>
                <div>
                  {r.entity_type || '—'} {r.entity_id ? `(${r.entity_id})` : ''}
                </div>
                <div className="muted">
                  {r.actor_key || '—'}
                  {r.actor_role ? ` / ${r.actor_role}` : ''}
                </div>
                <div className="muted">{r.org_id || '—'}</div>
                <div className="muted code-block" style={{maxWidth: 280, whiteSpace: 'pre-wrap'}}>
                  {r.details ? JSON.stringify(r.details) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
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

export default AuditLogsPage;
