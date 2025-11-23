import React, {useEffect, useMemo, useState} from 'react';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type ErrorLog = {
  id: string;
  org_id?: string;
  receiver_id?: string;
  message?: string;
  category?: string;
  created_at?: string;
};

const ErrorLogsPage = () => {
  const api = useApi();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [orgFilter, setOrgFilter] = useState('');
  const [receiverFilter, setReceiverFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (category !== 'all') params.category = category;
      if (orgFilter) params.orgId = orgFilter;
      if (receiverFilter) params.receiverId = receiverFilter;
      const res = await api.getOrgErrors(params);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setLogs(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load error logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [category, orgFilter, receiverFilter]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (category !== 'all') {
        const cat = (l.category || '').toLowerCase();
        if (!cat.includes(category)) return false;
      }
      return true;
    });
  }, [logs, category]);

  const categories = [
    {label: 'All', value: 'all'},
    {label: 'Invalid tokens', value: 'invalid'},
    {label: 'Replay', value: 'replay'},
    {label: 'Malformed', value: 'malformed'},
    {label: 'Server errors', value: 'server'},
  ];

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading error logs..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  return (
    <div className="overview">
      <Card>
        <div className="filters" style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Org ID"
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
          />
          <input
            className="input"
            placeholder="Receiver ID"
            value={receiverFilter}
            onChange={e => setReceiverFilter(e.target.value)}
          />
          <button className="secondary" type="button" onClick={load}>
            Refresh
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setCategory('all');
              setOrgFilter('');
              setReceiverFilter('');
            }}>
            Clear filters
          </button>
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <h2>Error logs</h2>
        </div>
        {filtered.length === 0 ? (
          <EmptyState message="No error logs found." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Time</div>
              <div>Org</div>
              <div>Receiver</div>
              <div>Category</div>
              <div>Message</div>
            </div>
            {filtered.map(log => (
              <div className="table__row" key={log.id}>
                <div>{formatTime(log.created_at)}</div>
                <div>{log.org_id || '—'}</div>
                <div>{log.receiver_id || '—'}</div>
                <div>
                  <span className="badge">{log.category || 'unknown'}</span>
                </div>
                <div>{log.message || '—'}</div>
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

export default ErrorLogsPage;
