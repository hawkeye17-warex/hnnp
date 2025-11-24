import React, {useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';

const GlobalSearchPage = () => {
  const api = useApi();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  const search = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setError('Enter a term to search.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.globalSearch(query.trim());
      setResults(res);
    } catch (err: any) {
      setError(err?.message ?? 'Search failed.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Global Search</h2>
            <p className="muted">Search across orgs, receivers, users, and presence logs.</p>
          </div>
          <form className="actions" onSubmit={search} style={{gap: 8}}>
            <input
              className="input"
              placeholder="Search term"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        </div>

        {loading ? (
          <LoadingState message="Searching..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => search()} />
        ) : results ? (
          <div className="grid" style={{gap: 16}}>
            <ResultSection title="Organizations" rows={results.orgs} render={org => (
              <div className="muted">
                <strong>{org.name || org.slug || org.id}</strong> ({org.id}) — {org.slug}
              </div>
            )} />
            <ResultSection title="Receivers" rows={results.receivers} render={r => (
              <div className="muted">
                <strong>{r.displayName || r.id}</strong> ({r.id}) — org {r.orgId}
              </div>
            )} />
            <ResultSection title="Users" rows={results.users} render={u => (
              <div className="muted">
                <strong>{u.email}</strong> ({u.name || '—'}) role {u.role}
              </div>
            )} />
            <ResultSection title="Logs" rows={results.logs} render={l => (
              <div className="muted">
                <strong>{l.id}</strong> — org {l.orgId}, rx {l.receiverId}, {l.authResult} at {formatDate(l.serverTimestamp)}
              </div>
            )} />
          </div>
        ) : (
          <div className="muted">Enter a query to search.</div>
        )}
      </Card>
    </div>
  );
};

const ResultSection = ({title, rows, render}: {title: string; rows: any[]; render: (row: any) => React.ReactNode}) => {
  if (!rows || rows.length === 0) {
    return (
      <Card>
        <h4>{title}</h4>
        <div className="muted">No results</div>
      </Card>
    );
  }
  return (
    <Card>
      <h4>{title}</h4>
      <div className="stack" style={{display: 'grid', gap: 6}}>
        {rows.map((r: any) => (
          <div key={r.id ?? `${title}-${Math.random()}`}>{render(r)}</div>
        ))}
      </div>
    </Card>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default GlobalSearchPage;
