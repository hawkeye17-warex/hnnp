import React, {useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useAuditEvents} from '../hooks/useAuditEvents';

const AuditTrailPage: React.FC = () => {
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const {data, loading, error, refetch, setFilters} = useAuditEvents();

  const onApply = () => {
    setFilters({action: action || undefined, userId: userId || undefined, from: from || undefined, to: to || undefined});
    refetch({action: action || undefined, userId: userId || undefined, from: from || undefined, to: to || undefined});
  };

  return (
    <div className="overview">
      <h1 className="page-title">Audit Trail</h1>

      <SectionCard title="Filters">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Action</label>
            <input
              className="input"
              placeholder="action name"
              value={action}
              onChange={e => setAction(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">User ID</label>
            <input
              className="input"
              placeholder="user id"
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">From</label>
            <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">To</label>
            <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn btn-primary" onClick={onApply}>
            Apply
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Audit Events" className="mt-4">
        {loading && <LoadingState message="Loading audit events..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && data.length === 0 && <div className="text-sm text-slate-500">No audit events found.</div>}
        {!loading && !error && data.length > 0 && (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {data.map(evt => (
                  <tr key={evt.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(evt.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{evt.user_id ?? '—'}</td>
                    <td className="py-2 pr-4">{evt.action}</td>
                    <td className="py-2 pr-4">
                      {evt.entity_type ?? '—'} {evt.entity_id ? `(${evt.entity_id})` : ''}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">
                      {evt.metadata ? JSON.stringify(evt.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default AuditTrailPage;
