import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import {useApi} from '../api/client';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

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

const OverviewPage = ({orgId}: Props) => {
  const api = useApi();
  const [org, setOrg] = useState<any>(null);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [orgRes, receiversRes, eventsRes] = await Promise.all([
          api.getOrg(orgId),
          api.getReceivers(orgId),
          api.getPresenceEvents({limit: 10, sort: 'desc'}, orgId),
        ]);
        if (!mounted) return;
        setOrg(orgRes);
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
        setError(err?.message ?? 'Failed to load overview.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api, orgId]);

  const {totalReceivers, onlineReceivers, eventsToday} = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const twentyMinutes = 20 * 60 * 1000;

    const online = receivers.filter(r => {
      if (r.status === 'online') return true;
      if (r.last_seen_at) {
        const last = new Date(r.last_seen_at).getTime();
        return !Number.isNaN(last) && now.getTime() - last < twentyMinutes;
      }
      return false;
    }).length;

    const todays = events.filter(ev => {
      const ts =
        ev.timestamp ||
        ev.occurredAt ||
        ev.createdAt ||
        (ev as any).time ||
        (ev as any).at;
      if (!ts) return false;
      const time = new Date(ts).getTime();
      return !Number.isNaN(time) && time >= startOfDay;
    }).length;

    return {
      totalReceivers: receivers.length,
      onlineReceivers: online,
      eventsToday: todays,
    };
  }, [receivers, events]);

  if (loading) {
    return (
      <div className="overview">
        <Card>
          <LoadingState message="Loading overview..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview">
        <Card>
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="overview">
      <div className="card-grid metrics-grid">
        <Card>
          <p className="muted">Organization</p>
          <h2>{org?.name ?? '—'}</h2>
          <p className="muted">Org ID: {org?.id ?? '—'}</p>
        </Card>
        <Card>
          <p className="muted">Receivers</p>
          <h2>{totalReceivers}</h2>
          <p className="muted">{onlineReceivers} online</p>
        </Card>
        <Card>
          <p className="muted">Events today</p>
          <h2>{eventsToday}</h2>
          <p className="muted">Last 10 shown below</p>
        </Card>
      </div>

      <Card>
        <div className="table__header">
          <h2>Recent presence events</h2>
        </div>
        {events.length === 0 ? (
          <EmptyState message="No recent events." />
        ) : (
          <div className="table">
            <div className="table__row table__head">
              <div>Time</div>
              <div>User</div>
              <div>Receiver</div>
              <div>Status</div>
            </div>
            {events.map(ev => (
              <div className="table__row" key={ev.id}>
                <div>{formatTime(ev)}</div>
                <div>{ev.userRef || '—'}</div>
                <div>{ev.receiverName || '—'}</div>
                <div>
                  <span className="badge">{ev.status || 'unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const formatTime = (ev: PresenceEvent) => {
  const ts =
    ev.timestamp ||
    ev.occurredAt ||
    ev.createdAt ||
    (ev as any).time ||
    (ev as any).at;
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

export default OverviewPage;
