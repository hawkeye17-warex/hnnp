import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import {useUsers} from '../hooks/useUsers';

type RoleFilter = 'all' | string;

const UsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');

  const {data: users, isLoading, error} = useUsers();

  const roles = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.role) set.add(u.role);
    });
    return Array.from(set);
  }, [users]);

  const filtered = useMemo(
    () =>
      users.filter(u => {
        const matchesRole = role === 'all' || u.role === role;
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.id?.toLowerCase().includes(term);
        return matchesRole && matchesSearch;
      }),
    [users, role, search],
  );

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>

      <SectionCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Search</span>
            <input
              type="text"
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              placeholder="Search by name or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Role</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={role}
              onChange={e => setRole(e.target.value as RoleFilter)}>
              <option value="all">All roles</option>
              {roles.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="User Directory">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading users...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">
            No users found. Invite users or clear your filters to see more.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-5 text-xs uppercase text-slate-500 pb-2">
              <span>Name</span>
              <span>Role</span>
              <span>Last seen</span>
              <span>HPS verification rate</span>
              <span>Details</span>
            </div>
            {filtered.map(user => (
              <details key={user.id} className="py-2">
                <summary className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 cursor-pointer">
                  <span className="text-sm text-slate-900">{user.name || user.email || user.id}</span>
                  <span className="text-sm text-slate-700">{user.role}</span>
                  <span className="text-sm text-slate-700">
                    {user.lastSeenAt
                      ? new Date(user.lastSeenAt).toLocaleString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </span>
                  <span className="text-sm text-slate-700">
                    {typeof user.hpsVerificationRate === 'number'
                      ? `${user.hpsVerificationRate}%`
                      : '—'}
                  </span>
                  <span className="text-sm text-blue-600 underline">Details</span>
                </summary>
                <div className="mt-2 text-sm text-slate-700 space-y-1">
                  {user.email && <div>Email: {user.email}</div>}
                  {user.id && <div>User ID: {user.id}</div>}
                  {user.role && <div>Role: {user.role}</div>}
                  {/* TODO: add useUserHpsStats(user.id) to show HPS summary when available */}
                </div>
              </details>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default UsersPage;
