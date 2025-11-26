import React, {useMemo} from 'react';
import StatCard from '../components/ui/StatCard';
import SectionCard from '../components/ui/SectionCard';
import StatusPill from '../components/ui/StatusPill';
import {useReceivers} from '../hooks/useReceivers';

const ReceiversPage: React.FC = () => {
  const {data: receivers, isLoading, error} = useReceivers();

  const stats = useMemo(() => {
    const total = receivers.length;
    const online = receivers.filter(r => (r.status ?? '').toLowerCase() === 'online').length;
    const offline = receivers.filter(r => (r.status ?? '').toLowerCase() === 'offline').length;
    const flaky = receivers.filter(r => (r.status ?? '').toLowerCase() === 'flaky').length;
    return {total, online, offline, flaky};
  }, [receivers]);

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Receivers</h1>

      <SectionCard title="Status overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total receivers" value={stats.total} />
          <StatCard title="Online" value={stats.online} />
          <StatCard title="Offline" value={stats.offline} />
          <StatCard title="Flaky" value={stats.flaky} />
        </div>
      </SectionCard>

      <SectionCard title="Receiver Fleet">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading receivers...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : receivers.length === 0 ? (
          <div className="text-sm text-slate-500">No receivers to display.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="hidden md:grid md:grid-cols-5 text-xs font-semibold text-slate-500 pb-2">
              <span>Name</span>
              <span>Location</span>
              <span>Status</span>
              <span>Last heartbeat</span>
              <span>Firmware</span>
            </div>
            {receivers.map(rcv => (
              <div
                key={rcv.id}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 py-3 text-sm text-slate-800">
                <div className="font-semibold">{rcv.name ?? rcv.id}</div>
                <div className="text-slate-600">{rcv.locationName ?? '—'}</div>
                <div>
                  <StatusPill status={mapStatusToPill(rcv.status)} />
                </div>
                <div className="text-slate-600">
                  {rcv.lastHeartbeatAt ? new Date(rcv.lastHeartbeatAt).toLocaleString() : '—'}
                </div>
                <div className="text-slate-600">{rcv.firmwareVersion ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const mapStatusToPill = (
  status?: string | null,
): 'online' | 'offline' | 'warning' => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'online' || normalized === 'active') return 'online';
  if (normalized === 'flaky' || normalized === 'warning') return 'warning';
  if (normalized === 'offline') return 'offline';
  return 'offline';
};

export default ReceiversPage;
