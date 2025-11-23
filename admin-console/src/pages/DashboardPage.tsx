import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type UsagePoint = {date: string; count: number; errors?: number};
type Receiver = {id: string; displayName?: string; status?: string; last_seen_at?: string};

const DashboardPage = () => {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrgs, setActiveOrgs] = useState(0);
  const [activeReceivers, setActiveReceivers] = useState(0);
  const [presenceToday, setPresenceToday] = useState(0);
  const [errorsToday, setErrorsToday] = useState(0);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [hourCounts, setHourCounts] = useState<Record<string, number>>({});
  const [receiverCounts, setReceiverCounts] = useState<Record<string, number>>({});
  const [orgCounts, setOrgCounts] = useState<Record<string, number>>({});
  const [errorUsage, setErrorUsage] = useState<UsagePoint[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [incidents, setIncidents] = useState<any[]>([]);
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const since = new Date();
        since.setDate(since.getDate() - 6);
        const until = new Date();
        const sinceStr = since.toISOString().slice(0, 10);
        const untilStr = until.toISOString().slice(0, 10);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [orgsRes, receiversRes, eventsRes, errsRes, metricsRes] = await Promise.all([
          api.getOrganizations().catch(() => []),
          api.getReceivers().catch(() => []),
          api.getPresenceEvents({from: since.toISOString(), to: until.toISOString(), limit: 2000}),
          api.getOrgErrors({since: since.toISOString()}).catch(() => []),
          api.getOrgUsageMetrics({since: sinceStr, until: untilStr}).catch(() => null),
        ]);

        if (!mounted) return;

        const orgList = Array.isArray(orgsRes) ? orgsRes : (orgsRes as any)?.data ?? [];
        setActiveOrgs(orgList.filter((o: any) => o.status === 'active' || !o.status).length);

        const recList: Receiver[] = Array.isArray(receiversRes) ? receiversRes : (receiversRes as any)?.data ?? [];
        const now = Date.now();
        const statusCounter: Record<string, number> = {};
        const activeRec = recList.filter((r: any) => {
          const s = computeStatus(r, now);
          statusCounter[s] = (statusCounter[s] ?? 0) + 1;
          if (s === 'Active' || s === 'Idle') return true;
          return false;
        }).length;
        setActiveReceivers(activeRec);
        setStatusCounts(statusCounter);

        const evList = Array.isArray(eventsRes)
          ? eventsRes
          : Array.isArray((eventsRes as any)?.events)
          ? (eventsRes as any).events
          : Array.isArray((eventsRes as any)?.data)
          ? (eventsRes as any).data
          : [];

        const today = new Date();
        const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        setPresenceToday(
          evList.filter(ev => {
            const ts = new Date(
              ev.timestamp || ev.occurredAt || ev.createdAt || (ev as any).time || (ev as any).at,
            ).getTime();
            return !Number.isNaN(ts) && ts >= startToday;
          }).length,
        );

        const errList = Array.isArray(errsRes) ? errsRes : (errsRes as any)?.data ?? [];
        setErrorsToday(
          errList.filter(err => {
            const ts = new Date(err.created_at || err.timestamp || err.time).getTime();
            return !Number.isNaN(ts) && ts >= startToday;
          }).length,
        );
        setIncidents(errList.slice(0, 10));

        const usagePoints: UsagePoint[] = [];
        const errorPoints: UsagePoint[] = [];
        if (metricsRes && (metricsRes as any).data && Array.isArray((metricsRes as any).data.daily)) {
          (metricsRes as any).data.daily.forEach((row: any) => {
            usagePoints.push({date: row.date, count: row.tokens ?? row.count ?? 0, errors: row.errors ?? 0});
            errorPoints.push({date: row.date, count: row.errors ?? 0});
          });
        } else {
          const counts: Record<string, number> = {};
          evList.forEach((ev: any) => {
            const ts = ev.timestamp || ev.occurredAt || ev.createdAt || ev.time || ev.at;
            if (!ts) return;
            const day = new Date(ts).toISOString().slice(0, 10);
            counts[day] = (counts[day] ?? 0) + 1;
          });
          Object.entries(counts).forEach(([date, count]) => usagePoints.push({date, count}));
        }
        setUsage(usagePoints.sort((a, b) => a.date.localeCompare(b.date)));
        setErrorUsage(errorPoints.sort((a, b) => a.date.localeCompare(b.date)));

        const hours: Record<string, number> = {};
        const recvCounts: Record<string, number> = {};
        const orgCountsLocal: Record<string, number> = {};
        const verCounts: Record<string, number> = {};
        evList.forEach((ev: any) => {
          const ts = ev.timestamp || ev.occurredAt || ev.createdAt || ev.time || ev.at;
          if (ts) {
            const d = new Date(ts);
            const h = String(d.getHours()).padStart(2, '0');
            hours[h] = (hours[h] ?? 0) + 1;
          }
          const rid = ev.receiverName || ev.receiverId || ev.receiver_id;
          if (rid) recvCounts[rid] = (recvCounts[rid] ?? 0) + 1;
          const org = ev.org_id || ev.orgId;
          if (org) orgCountsLocal[org] = (orgCountsLocal[org] ?? 0) + 1;
          const ver = ev.version || ev.token_prefix || 'unknown';
          verCounts[ver] = (verCounts[ver] ?? 0) + 1;
        });
        setHourCounts(hours);
        setReceiverCounts(recvCounts);
        setOrgCounts(orgCountsLocal);
        setVersionCounts(verCounts);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api]);

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading dashboard..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Card>
    );
  }

  const topReceivers = useMemo(
    () =>
      Object.entries(receiverCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    [receiverCounts],
  );

  const topOrgs = useMemo(
    () =>
      Object.entries(orgCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    [orgCounts],
  );

  return (
    <div className="overview">
      <div className="card-grid metrics-grid">
        <Card>
          <p className="muted">Active orgs</p>
          <h2>{activeOrgs}</h2>
        </Card>
        <Card>
          <p className="muted">Active receivers</p>
          <h2>{activeReceivers}</h2>
        </Card>
        <Card>
          <p className="muted">Presence today</p>
          <h2>{presenceToday}</h2>
        </Card>
        <Card>
          <p className="muted">Errors today</p>
          <h2>{errorsToday}</h2>
        </Card>
      </div>

      <Card>
        <div className="table__header">
          <h3>Presence over time (last 7 days)</h3>
        </div>
        {usage.length === 0 ? (
          <EmptyState message="No presence data available." />
        ) : (
          <>
            <svg width={320} height={60} style={{marginBottom: 8}}>
              <path
                d={sparklinePath(usage.map(u => u.count), 320, 60)}
                stroke="#2563eb"
                strokeWidth={2}
                fill="none"
              />
            </svg>
            <div className="table">
              <div className="table__row table__head">
                <div>Date</div>
                <div>Presence</div>
                <div>Errors</div>
              </div>
              {usage.map(point => (
                <div className="table__row" key={point.date}>
                  <div>{point.date}</div>
                  <div>{point.count}</div>
                  <div>{point.errors ?? '—'}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="card-grid metrics-grid">
        <Card>
          <h3>Receiver health</h3>
          {Object.keys(statusCounts).length === 0 ? (
            <EmptyState message="No receivers found." />
          ) : (
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {Object.entries(statusCounts).map(([k, v]) => (
                <div key={k} className="badge" style={{padding: '6px 10px'}}>
                  {k}: {v}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3>Traffic by hour</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8}}>
            {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(hour => (
              <div key={hour} style={{textAlign: 'center'}}>
                <div className="muted">{hour}</div>
                <div
                  style={{
                    background: '#2563eb',
                    height: `${Math.min(80, (hourCounts[hour] ?? 0) * 4)}px`,
                    width: '100%',
                    borderRadius: 4,
                  }}
                  aria-label={`${hour}: ${hourCounts[hour] ?? 0}`}
                />
                <div style={{fontSize: 12}}>{hourCounts[hour] ?? 0}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="card-grid metrics-grid">
        <Card>
          <h3>Top 10 busy receivers</h3>
          {topReceivers.length === 0 ? (
            <EmptyState message="No receiver activity." />
          ) : (
            <div className="table">
              <div className="table__row table__head">
                <div>Receiver</div>
                <div>Count</div>
              </div>
              {topReceivers.map(([r, c]) => (
                <div className="table__row" key={r}>
                  <div>{r}</div>
                  <div>{c}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3>Top 10 organizations</h3>
          {topOrgs.length === 0 ? (
            <EmptyState message="No org activity." />
          ) : (
            <div className="table">
              <div className="table__row table__head">
                <div>Org</div>
                <div>Count</div>
              </div>
              {topOrgs.map(([o, c]) => (
                <div className="table__row" key={o}>
                  <div>{o}</div>
                  <div>{c}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3>Error rate over time</h3>
        {errorUsage.length === 0 ? (
          <EmptyState message="No error data." />
        ) : (
          <>
            <svg width={320} height={60} style={{marginBottom: 8}}>
              <path
                d={sparklinePath(errorUsage.map(u => u.count), 320, 60)}
                stroke="#ef4444"
                strokeWidth={2}
                fill="none"
              />
            </svg>
            <div className="table">
              <div className="table__row table__head">
                <div>Date</div>
                <div>Errors</div>
              </div>
              {errorUsage.map(point => (
                <div className="table__row" key={point.date}>
                  <div>{point.date}</div>
                  <div>{point.count}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <h3>System incidents</h3>
        {incidents.length === 0 ? (
          <EmptyState message="No incidents." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Time</div>
              <div>Receiver</div>
              <div>Category</div>
              <div>Message</div>
            </div>
            {incidents.map((inc, idx) => (
              <div className="table__row" key={idx}>
                <div>{formatTime(inc.created_at || inc.timestamp)}</div>
                <div>{inc.receiver_id || '—'}</div>
                <div>{inc.category || '—'}</div>
                <div>{inc.message || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3>Token version distribution</h3>
        {Object.keys(versionCounts).length === 0 ? (
          <EmptyState message="No token data." />
        ) : (
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            {Object.entries(versionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([ver, count]) => (
              <div key={ver} className="badge" style={{padding: '6px 10px'}}>
                {ver}: {count}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const formatTime = (ts?: string) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const computeStatus = (
  r: Receiver,
  now: number,
): 'Active' | 'Idle' | 'Offline' | 'Unknown' => {
  const raw = (r.status || '').toLowerCase();
  const last = r.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
  if (last && !Number.isNaN(last)) {
    if (now - last < 5 * 60 * 1000) return 'Active';
    if (now - last < 30 * 60 * 1000) return 'Idle';
    return 'Offline';
  }
  if (raw === 'online' || raw === 'active') return 'Active';
  if (raw === 'idle') return 'Idle';
  if (raw === 'offline') return 'Offline';
  return 'Unknown';
};

const sparklinePath = (values: number[], w: number, h: number) => {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`);
  return `M${points.join(' L')}`;
};

export default DashboardPage;
