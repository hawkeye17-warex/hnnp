import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import IncidentList from '../components/ui/IncidentList';
import {useIncidents} from '../hooks/useIncidents';
import {useLocations} from '../hooks/useLocations';

type Severity = 'all' | 'info' | 'warning' | 'critical';

const IncidentsPage: React.FC = () => {
  const [severity, setSeverity] = useState<Severity>('all');
  const [range, setRange] = useState<string>('today');
  const [locationId, setLocationId] = useState<string>('');

  const {data: locations, isLoading: loadingLocations} = useLocations();
  const {data: incidents, isLoading, error} = useIncidents({
    severity: severity === 'all' ? undefined : severity,
    from: range === 'today' ? startOfDayIso() : undefined,
    locationId: locationId || undefined,
  });

  const rows = useMemo(
    () =>
      incidents.map(inc => ({
        id: inc.id,
        time: new Date(inc.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        severity: inc.severity,
        title: inc.title,
        location: inc.relatedLocationName ?? inc.relatedReceiverName ?? '—',
        description: inc.description,
      })),
    [incidents],
  );

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Incidents</h1>

      <SectionCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Severity</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={severity}
              onChange={e => setSeverity(e.target.value as Severity)}>
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Date range</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={range}
              onChange={e => setRange(e.target.value)}>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last hour</option>
              <option value="today">Today</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Location</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={locationId}
              onChange={e => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {loadingLocations ? (
                <option>Loading...</option>
              ) : (
                locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Incident Log">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading incidents...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-500">No incidents found.</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 text-xs font-semibold text-slate-500">
              <span>Time</span>
              <span>Severity</span>
              <span className="md:col-span-2">Title</span>
              <span>Location</span>
            </div>
            <div className="divide-y divide-slate-200">
              {rows.map(row => (
                <details key={row.id} className="py-2">
                  <summary className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-500">{row.time}</span>
                    <span className="text-xs font-semibold capitalize">{row.severity}</span>
                    <span className="md:col-span-2 text-sm text-slate-900">{row.title}</span>
                    <span className="text-sm text-slate-700">{row.location}</span>
                  </summary>
                  {row.description && (
                    <div className="mt-2 text-sm text-slate-700">{row.description}</div>
                  )}
                </details>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const startOfDayIso = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startOfDay.toISOString();
};

export default IncidentsPage;
