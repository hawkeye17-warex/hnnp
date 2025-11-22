import React, {useEffect, useMemo, useState} from 'react';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import './UsageDashboard.css';

type Props = { orgId?: string | number | null };

const rangeDays = (days: number) => {
  const arr: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
};

const makeBuckets = (keys: string[]) => Object.fromEntries(keys.map(k => [k, 0]));

const sparklinePath = (values: number[], w = 120, h = 40) => {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`);
  return `M${points.join(' L')}`;
};

const UsageDashboard = ({orgId}: Props) => {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = 30;
  const keys = useMemo(() => rangeDays(days), [days]);

  const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>(makeBuckets(keys));
  const [tokensCounts, setTokensCounts] = useState<Record<string, number>>(makeBuckets(keys));
  const [errorsCounts, setErrorsCounts] = useState<Record<string, number>>(makeBuckets(keys));
  const [activeReceivers, setActiveReceivers] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const since = keys[0];
        const until = keys[keys.length - 1];

        // run independent requests in parallel
        const peP = api.getPresenceEvents({since, until});
        const rP = api.getReceivers();
        const metricsP = api.getOrgUsageMetrics({since, until}, orgId as any).catch(() => null);
        const errsP = api.getOrgErrors({since, until}, orgId as any).catch(() => null);

        const [pe, r, metrics, errs] = await Promise.all([peP, rP, metricsP, errsP]);

        // presence
        const events = Array.isArray(pe) ? pe : (pe as any)?.data ?? [];
        const pBuckets = makeBuckets(keys);
        for (const ev of events) {
          const d = new Date(ev?.ts || ev?.created_at || ev?.time || ev?.timestamp);
          if (isNaN(d.getTime())) continue;
          const k = d.toISOString().slice(0, 10);
          if (k in pBuckets) pBuckets[k]++;
        }

        // active receivers
        const receivers = Array.isArray(r) ? r : (r as any)?.data ?? [];
        const active = receivers.filter((x: any) => !x.archived && (x.status ? x.status === 'active' : true)).length;

        // tokens processed - prefer metrics endpoint response
        let tBuckets = makeBuckets(keys);
        let eBuckets = makeBuckets(keys);
        if (metrics && (metrics as any).data && Array.isArray((metrics as any).data.daily)) {
          for (const row of (metrics as any).data.daily) {
            if (row.date in tBuckets) tBuckets[row.date] = row.tokens ?? row.count ?? 0;
            if (row.date in eBuckets) eBuckets[row.date] = row.errors ?? eBuckets[row.date] ?? 0;
          }
        } else {
          tBuckets = {...pBuckets};
        }

        // errors - if dedicated endpoint returned a list of events
        if (errs) {
          const list = Array.isArray(errs) ? errs : (errs as any)?.data ?? [];
          for (const err of list) {
            const d = new Date(err?.ts || err?.created_at || err?.time || err?.timestamp);
            if (isNaN(d.getTime())) continue;
            const k = d.toISOString().slice(0, 10);
            if (k in eBuckets) eBuckets[k]++;
          }
        }

        if (!mounted) return;
        setPresenceCounts(pBuckets);
        setTokensCounts(tBuckets);
        setErrorsCounts(eBuckets);
        setActiveReceivers(active);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load usage metrics');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, orgId]);

  if (loading) return <Card><LoadingState message="Loading usage dashboard..." /></Card>;
  if (error) return <Card><ErrorState message={error} onRetry={() => window.location.reload()} /></Card>;

  const presenceArr = keys.map(k => presenceCounts[k] ?? 0);
  const tokensArr = keys.map(k => tokensCounts[k] ?? 0);
  const errorsArr = keys.map(k => errorsCounts[k] ?? 0);

  return (
    <div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12}}>
        <Card>
          <h3>Daily Presence (30d)</h3>
          <div className="metric-number">{presenceArr.reduce((a,b)=>a+b,0)}</div>
          <svg width={140} height={48}><path d={sparklinePath(presenceArr, 140, 48)} stroke="#2563eb" strokeWidth={2} fill="none" /></svg>
        </Card>

        <Card>
          <h3>Active Receivers</h3>
          <div className="metric-number">{activeReceivers}</div>
          <svg width={140} height={48}><path d={sparklinePath(Array(keys.length).fill(activeReceivers), 140, 48)} stroke="#059669" strokeWidth={2} fill="none" /></svg>
        </Card>

        <Card>
          <h3>Tokens Processed (30d)</h3>
          <div className="metric-number">{tokensArr.reduce((a,b)=>a+b,0)}</div>
          <svg width={140} height={48}><path d={sparklinePath(tokensArr, 140, 48)} stroke="#f97316" strokeWidth={2} fill="none" /></svg>
        </Card>

        <Card>
          <h3>Errors (30d)</h3>
          <div className="metric-number">{errorsArr.reduce((a,b)=>a+b,0)}</div>
          <svg width={140} height={48}><path d={sparklinePath(errorsArr, 140, 48)} stroke="#ef4444" strokeWidth={2} fill="none" /></svg>
        </Card>
      </div>

      <div style={{marginTop: 12}}>
        <Card>
          <h3>Daily Breakdown</h3>
          <div style={{overflow: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'left', padding: 8}}>Date</th>
                  <th style={{textAlign: 'right', padding: 8}}>Presence</th>
                  <th style={{textAlign: 'right', padding: 8}}>Tokens</th>
                  <th style={{textAlign: 'right', padding: 8}}>Errors</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k}>
                    <td style={{padding: 8}}>{k}</td>
                    <td style={{padding: 8, textAlign: 'right'}}>{presenceCounts[k] ?? 0}</td>
                    <td style={{padding: 8, textAlign: 'right'}}>{tokensCounts[k] ?? 0}</td>
                    <td style={{padding: 8, textAlign: 'right'}}>{errorsCounts[k] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UsageDashboard;
