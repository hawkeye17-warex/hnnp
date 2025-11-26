import React, {useEffect, useMemo, useState} from 'react';

import {useApi} from '../api/client';
import IncidentList from '../components/ui/IncidentList';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import StatusPill from '../components/ui/StatusPill';

type Receiver = {
  id: string;
  name?: string;
  status?: string;
  last_seen_at?: string;
};

type PresenceEvent = {
  id: string;
  timestamp?: string;
  occurredAt?: string;
  createdAt?: string;
  userRef?: string;
  receiverName?: string;
  status?: string;
};

type Props = {orgId?: string};

const OverviewPage: React.FC<Props> = ({orgId}) => {
  const api = useApi();
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [realtime, setRealtime] = useState<{
    eventsPerSec: number;
    activeReceivers: number;
    onlineUsers: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [receiversRes, eventsRes] = await Promise.all([
          api.getReceivers(orgId),
          api.getPresenceEvents({limit: 10, sort: 'desc'}, orgId),
        ]);
        if (!mounted) return;
        const receiversData = Array.isArray(receiversRes)
          ? receiversRes
          : Array.isArray((receiversRes as any)?.data)
          ? (receiversRes as any).data
          : [];
        const eventsData = Array.isArray((eventsRes as any)?.events)
          ? (eventsRes as any).events
          : Array.isArray((eventsRes as any)?.data)
          ? (eventsRes as any).data
          : Array.isArray(eventsRes)
          ? eventsRes
          : [];
        setReceivers(receiversData);
        setEvents(eventsData);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load overview data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api, orgId]);

  useEffect(() => {
    let cancelled = false;
    const loadRealtime = async () => {
      try {
        const data = await api.getRealtimeMetrics(orgId, {windowSeconds: 60, receiversMinutes: 5});
        if (cancelled) return;
        setRealtime({
          eventsPerSec: Number(data?.events_per_sec ?? 0),
          activeReceivers: Number(data?.active_receivers ?? 0),
          onlineUsers: Number(data?.online_users ?? 0),
        });
      } catch {
        if (cancelled) return;
        setRealtime(null);
      }
    };
    loadRealtime();
    const timer = setInterval(loadRealtime, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api, orgId]);

  const {eventsToday} = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todays = events.filter(ev => {
      const ts = ev.timestamp || ev.occurredAt || ev.createdAt || (ev as any).time || (ev as any).at;
      if (!ts) return false;
      const time = new Date(ts).getTime();
      return !Number.isNaN(time) && time >= startOfDay;
    }).length;
    return {eventsToday: todays};
  }, [events]);

  const receiverList = receivers.length
    ? receivers.map(r => ({
        name: r.name ?? r.id,
        status: r.status === 'online' ? 'online' : r.status === 'offline' ? 'offline' : 'warning',
      }))
    : [
        {name: 'R-ENG201-CEIL', status: 'online' as const},
        {name: 'R-ENG202-WALL', status: 'online' as const},
        {name: 'R-LAB3B-DOOR', status: 'offline' as const},
        {name: 'R-ENG201-DOOR', status: 'online' as const},
      ];

  const incidents = [
    {time: '10:17', description: 'Receiver R-ENG201-DOOR went offline (5 min)'},
    {time: '10:22', description: 'HPS low confidence for 3 users in COMP 1020'},
    {time: '10:35', description: 'Webhook /uofm/attendance retry succeeded'},
  ];

  const metrics = {
    activeSessions: realtime?.onlineUsers ?? 5,
    presentUsers: eventsToday || 214,
    incidents: incidents.length,
  };

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Row 1: metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Sessions" value={metrics.activeSessions} />
        <StatCard title="Present Users" value={metrics.presentUsers} />
        <StatCard title="Incidents" value={metrics.incidents} />
      </div>

      {/* Row 2: Presence timeline + Receivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Presence Timeline" className="lg:col-span-2">
          <div className="space-y-4">
            {['ENG 201', 'ENG 202', 'Lab 3B'].map((label, idx) => (
              <div key={label} className="grid grid-cols-[100px,1fr] items-center gap-3">
                <div className="text-xs font-medium text-slate-600">{label}</div>
                <div className="flex items-center gap-3">
                  {[0, 1, 2, 3].map(dot => (
                    <span
                      key={`${label}-${dot}`}
                      className={`h-2.5 w-2.5 rounded-full ${
                        (idx + dot) % 3 === 0 ? 'bg-blue-500' : 'bg-blue-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[100px,1fr] items-center gap-3">
              <div />
              <div className="flex justify-between text-xs text-slate-500 max-w-sm">
                {['10:10', '10:20', '10:30', '10:40'].map(t => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Receivers">
          {loading && receiverList.length === 0 ? (
            <div className="text-sm text-slate-500">Loading receivers...</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {receiverList.map(r => (
                <div key={r.name} className="py-2 flex items-center justify-between">
                  <span className="text-sm text-slate-900">{r.name}</span>
                  <StatusPill status={r.status as 'online' | 'offline' | 'warning'} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 3: Sessions + Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Today’s Sessions" className="lg:col-span-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">COMP 1020 – Lecture</div>
              <div className="text-xs text-slate-600">10:00–11:15</div>
            </div>
            <div className="text-sm text-slate-600">Prof. Smith</div>
            <div className="flex items-center gap-3 pt-2">
              <div className="text-sm font-medium text-slate-900">72 / 84 Present</div>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Incidents">
          <IncidentList incidents={incidents} />
        </SectionCard>
      </div>
    </div>
  );
};

export default OverviewPage;
