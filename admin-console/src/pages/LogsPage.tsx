import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import {useLogs} from '../hooks/useLogs';
import type {LogEntry} from '../types/logs';

type LevelFilter = 'all' | 'info' | 'warn' | 'error';

const LogsPage: React.FC = () => {
  const [level, setLevel] = useState<LevelFilter>('all');
  const [category, setCategory] = useState<string>('');
  const [range, setRange] = useState<string>('today');

  const {data: logs, isLoading, error} = useLogs({
    level: level === 'all' ? undefined : level,
    category: category || undefined,
    from: range === 'today' ? startOfDayIso() : undefined,
  });

  const categories = useMemo(
    () =>
      Array.from(new Set(logs.map(l => l.category).filter((c): c is string => Boolean(c)))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [logs],
  );

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          (logs.map(l => l.level).filter(Boolean) as LogEntry['level'][]).map(l => l ?? 'info'),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [logs],
  );

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Logs</h1>

      <SectionCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
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
            <span className="font-semibold text-slate-900">Level</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={level}
              onChange={e => setLevel(e.target.value as LevelFilter)}>
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              {levels
                .filter(l => l && !['info', 'warn', 'error'].includes(l.toLowerCase()))
                .map(l => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-900">Category</span>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 bg-white"
              value={category}
              onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="System Logs">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading logs...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-slate-500">No logs available for selected filters.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="hidden md:grid md:grid-cols-4 text-xs font-semibold text-slate-500 pb-2">
              <span>Time</span>
              <span>Level</span>
              <span>Category</span>
              <span>Message</span>
            </div>
            {logs.map(log => (
              <details
                key={log.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-2 py-3 text-sm text-slate-800">
                <summary className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start cursor-pointer">
                  <span className="text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <LevelBadge level={log.level} />
                  <span className="text-slate-700">{log.category ?? '—'}</span>
                  <span className="text-slate-900 line-clamp-2">{log.message}</span>
                </summary>
                {log.metadata && (
                  <pre className="col-span-full bg-slate-50 text-xs text-slate-700 rounded-md p-3 overflow-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </details>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const LevelBadge: React.FC<{level?: LogEntry['level']}> = ({level}) => {
  const normalized = (level ?? '').toLowerCase();
  const colors =
    normalized === 'error'
      ? 'bg-red-100 text-red-700'
      : normalized === 'warn'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${colors}`}>
      {level ?? 'info'}
    </span>
  );
};

const startOfDayIso = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startOfDay.toISOString();
};

export default LogsPage;
