import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import {useGroups} from '../hooks/useAttendance';

const GroupsPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('');

  const {data: groups, isLoading, error} = useGroups();

  const filtered = useMemo(
    () =>
      groups.filter(g => {
        const matchesType = typeFilter === 'all' || g.type === typeFilter;
        const matchesLoc =
          !locationFilter ||
          (g.locationName && g.locationName.toLowerCase().includes(locationFilter.toLowerCase()));
        return matchesType && matchesLoc;
      }),
    [groups, typeFilter, locationFilter],
  );

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Groups & Sessions</h1>

      <SectionCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Type</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="class">Class</option>
              <option value="group">Group</option>
              <option value="shift">Shift</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-semibold text-slate-900">Location (contains)</span>
            <input
              type="text"
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              placeholder="Filter by location"
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Groups & Sessions">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading groups...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No groups/sessions found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(g => (
              <div
                key={g.id}
                className="border border-slate-200 rounded-md p-3 bg-white flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 truncate">{g.name}</div>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {g.type}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{g.locationName || 'No location'}</div>
                <div className="text-sm text-slate-700">
                  {g.scheduleDescription || 'No schedule description'}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            className="text-sm text-blue-600 underline"
            onClick={() => {
              // TODO: hook up to create flow
              alert('Create flow coming soon');
            }}>
            Create new
          </button>
        </div>
      </SectionCard>
    </div>
  );
};

export default GroupsPage;
