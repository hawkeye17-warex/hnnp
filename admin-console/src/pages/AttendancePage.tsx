import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import {useAttendance, useGroups} from '../hooks/useAttendance';

type GroupOption = {id: string; name: string};

const AttendancePage: React.FC = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [groupId, setGroupId] = useState<string>('');

  const {data: groups, isLoading: loadingGroups} = useGroups();
  const {data: records, isLoading, error} = useAttendance({
    from: date ? new Date(date).toISOString() : undefined,
    groupId: groupId || undefined,
  });

  const sessions = useMemo(() => {
    const map = new Map<string, {name: string; location?: string; total: number}>();
    records.forEach(r => {
      const key = r.sessionName;
      const existing = map.get(key) || {name: r.sessionName, location: '', total: 0};
      existing.total += 1;
      map.set(key, existing);
    });
    return Array.from(map.values());
  }, [records]);

  const statusColor = (status?: string) => {
    if (status === 'present') return 'text-green-700';
    if (status === 'late') return 'text-amber-700';
    if (status === 'absent') return 'text-red-700';
    return 'text-slate-700';
  };

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Sessions" className="lg:col-span-1">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-2">
                <span className="font-semibold text-slate-900">Date</span>
                <input
                  type="date"
                  className="border border-slate-300 rounded-md px-3 py-2 bg-white"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
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
                    (groups as GroupOption[]).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2">
              {sessions.length === 0 ? (
                <div className="text-sm text-slate-500">No sessions found.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div
                      key={session.name}
                      className="flex items-center justify-between text-sm text-slate-800">
                      <div className="truncate">
                        <div className="font-semibold text-slate-900">{session.name}</div>
                        <div className="text-xs text-slate-500">{session.location || '—'}</div>
                      </div>
                      <div className="text-xs text-slate-600 text-right">n/a</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Attendance Records" className="lg:col-span-2">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading records...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : records.length === 0 ? (
            <div className="text-sm text-slate-500">
              No attendance records for this range. Check receivers and filters.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm text-slate-700">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left py-2 pr-3">User</th>
                    <th className="text-left py-2 pr-3">Session</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">First seen</th>
                    <th className="text-left py-2 pr-3">Last seen</th>
                    <th className="text-left py-2">HPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map(rec => (
                    <tr key={rec.id}>
                      <td className="py-2 pr-3 text-slate-900">{rec.userName || rec.userRef}</td>
                      <td className="py-2 pr-3">{rec.sessionName}</td>
                      <td className={`py-2 pr-3 font-semibold ${statusColor(rec.status)}`}>
                        {rec.status ?? '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {rec.firstSeenAt
                          ? new Date(rec.firstSeenAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {rec.lastSeenAt
                          ? new Date(rec.lastSeenAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-2">
                        <span className="text-xs text-slate-700">{rec.hpsStatus ?? 'unknown'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default AttendancePage;
