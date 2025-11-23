import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type Receiver = {
  id: string;
  org_id?: string;
  displayName?: string;
  location?: string;
  status?: string;
  last_seen_at?: string;
};

const HealthPage = () => {
  const api = useApi();
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReceivers();
      setReceivers(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load receivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const aggregates = useMemo(() => {
    let active = 0;
    let idle = 0;
    let offline = 0;
    let misconfig = 0;
    let expired = 0;
    receivers.forEach(r => {
      const s = computeStatus(r);
      if (s === 'Active') active++;
      else if (s === 'Idle') idle++;
      else if (s === 'Offline') offline++;
      else if (s === 'Misconfigured') misconfig++;
      else if (s === 'Key expired') expired++;
    });
    return {active, idle, offline, misconfig, expired, total: receivers.length};
  }, [receivers]);

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV appears empty');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const idIdx = headers.indexOf('receiver_id');
      const nameIdx = headers.indexOf('display_name');
      const orgIdx = headers.indexOf('org_id');
      const locIdx = headers.indexOf('location_label');
      if (idIdx === -1 || orgIdx === -1) throw new Error('CSV must include receiver_id and org_id');
      let createdCount = 0;
      let failed = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const payload: any = {
          receiver_id: cols[idIdx],
          org_id: cols[orgIdx],
          display_name: nameIdx !== -1 ? cols[nameIdx] : undefined,
          location_label: locIdx !== -1 ? cols[locIdx] : undefined,
        };
        if (!payload.receiver_id || !payload.org_id) {
          failed++;
          continue;
        }
        try {
          await api.createReceiver(payload, payload.org_id);
          createdCount++;
        } catch {
          failed++;
        }
      }
      setImportMsg(`Import complete: ${createdCount} created${failed ? `, ${failed} failed` : ''}.`);
      await load();
    } catch (err: any) {
      setImportMsg(err?.message ?? 'Failed to import receivers CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading receiver health..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  if (receivers.length === 0) {
    return (
      <Card>
        <EmptyState message="No receivers found." />
      </Card>
    );
  }

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <h2>Health</h2>
          <div className="actions">
            <button className="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? 'Importing…' : 'Import CSV'}
            </button>
            {importMsg ? <div className="muted">{importMsg}</div> : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{display: 'none'}}
              onChange={e => handleImportFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="card-grid metrics-grid">
          <div>
            <p className="muted">Total</p>
            <h3>{aggregates.total}</h3>
          </div>
          <div>
            <p className="muted">Active</p>
            <h3>{aggregates.active}</h3>
          </div>
          <div>
            <p className="muted">Idle</p>
            <h3>{aggregates.idle}</h3>
          </div>
          <div>
            <p className="muted">Offline</p>
            <h3>{aggregates.offline}</h3>
          </div>
          <div>
            <p className="muted">Misconfigured</p>
            <h3>{aggregates.misconfig}</h3>
          </div>
          <div>
            <p className="muted">Key expired</p>
            <h3>{aggregates.expired}</h3>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table__header">
          <h3>Receivers</h3>
        </div>
        <div className="table">
          <div className="table__row table__head">
            <div>ID</div>
            <div>Org</div>
            <div>Name</div>
            <div>Status</div>
            <div>Last seen</div>
          </div>
          {receivers.map(r => (
            <div className="table__row" key={r.id}>
              <div>
                <Link to={`/receivers/${r.id}`}>{r.id}</Link>
              </div>
              <div>{r.org_id || '—'}</div>
              <div>{r.displayName || '—'}</div>
              <div>
                <span className="badge">{computeStatus(r)}</span>
              </div>
              <div>{formatTime(r.last_seen_at)}</div>
            </div>
          ))}
        </div>
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
): 'Active' | 'Idle' | 'Offline' | 'Misconfigured' | 'Key expired' | 'Unknown' => {
  const raw = (r.status || '').toLowerCase();
  if (raw.includes('misconfig')) return 'Misconfigured';
  if (raw.includes('expired')) return 'Key expired';
  const last = r.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
  const now = Date.now();
  if (last && !Number.isNaN(last)) {
    if (now - last < 5 * 60 * 1000) return 'Active';
    if (now - last < 30 * 60 * 1000) return 'Idle';
    return 'Offline';
  }
  if (raw === 'online' || raw === 'active') return 'Active';
  if (raw === 'idle') return 'Idle';
  if (raw === 'offline' || raw === 'unreachable') return 'Offline';
  return 'Unknown';
};

export default HealthPage;
