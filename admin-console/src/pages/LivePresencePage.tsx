import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import StatusPill from '../components/ui/StatusPill';
import {usePresenceStream} from '../hooks/usePresenceStream';
import {useReceivers} from '../hooks/useReceivers';
import {useLocations} from '../hooks/useLocations';
import {useGroups} from '../hooks/useAttendance';

type RangeKey = '15m' | '1h' | 'today';

const rangeOptions: {key: RangeKey; label: string}[] = [
  {key: '15m', label: 'Last 15 minutes'},
  {key: '1h', label: 'Last hour'},
  {key: 'today', label: 'Today'},
];

const LivePresencePage: React.FC = () => {
  const [range, setRange] = useState<RangeKey>('15m');
  const [locationId, setLocationId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');

  const {data: locations, isLoading: loadingLocations} = useLocations();
  const {data: groups, isLoading: loadingGroups} = useGroups();

  const rangeFrom = useMemo(() => {
    const now = new Date();
    if (range === '15m') {
      return new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    }
    if (range === '1h') {
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay.toISOString();
  }, [range]);

  const presenceFilters = useMemo(
    () => ({
      from: rangeFrom,
      locationId: locationId || undefined,
      groupId: groupId || undefined,
    }),
    [rangeFrom, locationId, groupId],
  );

  const {data: events, isLoading, error} = usePresenceStream(presenceFilters);
  const {data: receivers, isLoading: loadingReceivers, error: receiverError} = useReceivers();

  const groupedReceivers = useMemo(() => {
    const grouped: Record<string, {location: string; items: typeof receivers}> = {};
    receivers.forEach(r => {
      const key = r.locationName || 'Unassigned';
      if (!grouped[key]) grouped[key] = {location: key, items: []};
      grouped[key].items.push(r);
    });
    return Object.values(grouped);
  }, [receivers]);

  const mapHpsToStatus = (hps?: string) => {
    if (hps === 'verified') return 'online';
    if (hps === 'failed') return 'offline';
    return 'warning';
  };

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Live Presence</h1>

      <SectionCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Date range</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={range}
              onChange={e => setRange(e.target.value as RangeKey)}>
              {rangeOptions.map(opt => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
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

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Session / Group</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={groupId}
              onChange={e => setGroupId(e.target.value)}>
              <option value="">All sessions</option>
              {loadingGroups ? (
                <option>Loading...</option>
              ) : (
                groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Live Presence Stream" className="lg:col-span-2">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading live events...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-slate-500">No events in this range.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {events.map(ev => (
                <div key={ev.id} className="py-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                  <div className="text-xs text-slate-500">
                    {new Date(ev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                  </div>
                  <div className="text-sm text-slate-900">{ev.userName || ev.userRef || 'Unknown user'}</div>
                  <div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        ev.eventType === 'join'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                      {ev.eventType === 'join' ? 'Join' : 'Leave'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">
                    {ev.locationName || ev.receiverName || 'Unknown location'}
                  </div>
                  <div className="justify-self-start">
                    <StatusPill status={mapHpsToStatus(ev.hpsStatus) as 'online' | 'offline' | 'warning'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Active Rooms">
          {loadingReceivers ? (
            <div className="text-sm text-slate-500">Loading receivers...</div>
          ) : receiverError ? (
            <div className="text-sm text-red-600">{receiverError}</div>
          ) : groupedReceivers.length === 0 ? (
            <div className="text-sm text-slate-500">No receivers found.</div>
          ) : (
            <div className="space-y-4">
              {groupedReceivers.map(group => (
                <div key={group.location} className="space-y-2">
                  <div className="text-sm font-semibold text-slate-900">{group.location}</div>
                  <div className="divide-y divide-slate-200">
                    {group.items.map(r => (
                    <div key={r.id} className="py-2 flex items-center justify-between">
                      <div className="text-sm text-slate-800">{r.name}</div>
                      <StatusPill
                        status={
                          r.status === 'flaky'
                            ? 'warning'
                            : (r.status as 'online' | 'offline' | 'warning')
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default LivePresencePage;
