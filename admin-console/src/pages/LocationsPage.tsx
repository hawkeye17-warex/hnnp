import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import StatusPill from '../components/ui/StatusPill';
import {useLocations} from '../hooks/useLocations';

type StatusFilter = 'all' | 'active' | 'inactive';

const LocationsPage: React.FC = () => {
  const [campus, setCampus] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const {data: locations, isLoading, error} = useLocations();

  const campuses = useMemo(
    () =>
      Array.from(
        new Set(
          locations
            .map(loc => loc.campusOrSite)
            .filter((c): c is string => Boolean(c)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [locations],
  );

  const filtered = useMemo(
    () =>
      locations.filter(loc => {
        const matchesCampus = campus ? loc.campusOrSite === campus : true;
        const normalizedStatus = (loc.status ?? '').toLowerCase();
        const matchesStatus =
          status === 'all'
            ? true
            : normalizedStatus === status ||
              (status === 'active' && normalizedStatus === '') ||
              (status === 'inactive' && normalizedStatus === '');
        return matchesCampus && matchesStatus;
      }),
    [campus, locations, status],
  );

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Locations</h1>

      <SectionCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Campus / Site</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={campus}
              onChange={e => setCampus(e.target.value)}>
              <option value="">All campuses</option>
              {campuses.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Status</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={status}
              onChange={e => setStatus(e.target.value as StatusFilter)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Locations">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading locations...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No locations to display.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="hidden md:grid md:grid-cols-6 text-xs font-semibold text-slate-500 pb-2">
              <span>Name</span>
              <span>Code</span>
              <span>Campus / Site</span>
              <span>Receivers</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            {filtered.map(loc => (
              <div
                key={loc.id}
                className="grid grid-cols-1 md:grid-cols-6 gap-2 py-3 text-sm text-slate-800">
                <div className="font-semibold">{loc.name}</div>
                <div className="text-slate-600">{loc.code ?? '—'}</div>
                <div className="text-slate-600">{loc.campusOrSite ?? '—'}</div>
                <div className="text-slate-600">{loc.receiverCount ?? '—'}</div>
                <div>
                  <StatusPill status={(loc.status as any) === 'inactive' ? 'offline' : 'online'} />
                </div>
                <div className="md:text-right">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 font-semibold">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default LocationsPage;
