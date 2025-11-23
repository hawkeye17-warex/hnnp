import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import EmptyState from '../components/EmptyState';

type UsagePoint = {date: string; count: number; errors?: number};

const DashboardPage = () => {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrgs, setActiveOrgs] = useState(0);
  const [activeReceivers, setActiveReceivers] = useState(0);
  const [presenceToday, setPresenceToday] = useState(0);
  const [errorsToday, setErrorsToday] = useState(0);
  const [usage, setUsage] = useState<UsagePoint[]>([]);

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
          api.getPresenceEvents({from: startOfDay.toISOString(), to: new Date().toISOString(), limit: 1000}),
          api.getOrgErrors({since: startOfDay.toISOString()}).catch(() => []),
          api.getOrgUsageMetrics({since: sinceStr, until: untilStr}).catch(() => null),
        ]);

        if (!mounted) return;

        const orgList = Array.isArray(orgsRes) ? orgsRes : (orgsRes as any)?.data ?? [];
        setActiveOrgs(orgList.filter((o: any) => o.status === 'active' || !o.status).length);

        const recList = Array.isArray(receiversRes) ? receiversRes : (receiversRes as any)?.data ?? [];
        const now = Date.now();
        const activeRec = recList.filter((r: any) => {
          if (r.status === 'online' || r.status === 'active') return true;
          if (r.last_seen_at) {
            const t = new Date(r.last_seen_at).getTime();
            return !Number.isNaN(t) && now - t < 20 * 60 * 1000;
          }
          return false;
        }).length;
        setActiveReceivers(activeRec);

        const evList = Array.isArray(eventsRes)
          ? eventsRes
          : Array.isArray((eventsRes as any)?.events)
          ? (eventsRes as any).events
          : Array.isArray((eventsRes as any)?.data)
          ? (eventsRes as any).data
          : [];
        setPresenceToday(evList.length);

        const errList = Array.isArray(errsRes) ? errsRes : (errsRes as any)?.data ?? [];
        setErrorsToday(errList.length);

        const usagePoints: UsagePoint[] = [];
        if (metricsRes && (metricsRes as any).data && Array.isArray((metricsRes as any).data.daily)) {
          (metricsRes as any).data.daily.forEach((row: any) => {
            usagePoints.push({date: row.date, count: row.tokens ?? row.count ?? 0, errors: row.errors ?? 0});
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
          <h3>Daily presence (last week)</h3>
        </div>
        {usage.length === 0 ? (
          <EmptyState message="No presence data available." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Date</div>
              <div>Count</div>
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
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
