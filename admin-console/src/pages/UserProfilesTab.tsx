import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';

type Profile = {
  id: string;
  user_id: string;
  org_id: string;
  type: string;
  capabilities: string[];
  created_at?: string;
  org_status?: string;
  user_missing?: boolean;
};

type Props = {
  orgId: string;
};

const UserProfilesTab = ({orgId}: Props) => {
  const api = useApi();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [formUser, setFormUser] = useState('');
  const [formType, setFormType] = useState('');
  const [formCaps, setFormCaps] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const presets = useMemo(
    () => [
      {label: 'Student (attendance + quiz)', caps: ['attendance', 'quiz']},
      {label: 'Worker (attendance + shift + breaks)', caps: ['attendance', 'shift', 'breaks']},
      {label: 'Viewer (view-only attendance)', caps: ['attendance:view']},
    ],
    [],
  );
  const [activityProfile, setActivityProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<any | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [reportProfile, setReportProfile] = useState<Profile | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [capSaving, setCapSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrgProfiles(orgId, search.trim() || undefined);
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setProfiles(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load user profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter(p => p.user_id.toLowerCase().includes(term) || (p.type ?? '').toLowerCase().includes(term));
  }, [profiles, search]);

  return (
    <Card>
      <div className="table__header">
        <div>
          <h2>User Profiles</h2>
          <p className="muted">Profiles for this org. Search by user email/ID or profile type.</p>
        </div>
        <div className="actions" style={{gap: 8}}>
          <input
            className="input"
            placeholder="Search by user or type"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="secondary" type="button" onClick={() => setSearch('')}>
            Clear
          </button>
          <button className="primary" type="button" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setFormUser('');
              setFormType('');
              setFormCaps('');
              setFormErr(null);
              setFormOpen(true);
            }}>
            + New profile
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading profiles..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No profiles found." />
      ) : (
        <div className="table">
          <div className="table__row table__head">
            <div>User</div>
            <div>Type</div>
            <div>Capabilities</div>
            <div>Created</div>
          </div>
          {filtered.map(p => (
            <div className="table__row" key={p.id}>
              <div>
                {p.user_id}{' '}
                {(p.user_missing || (p.org_status && p.org_status.toLowerCase() !== 'active')) && (
                  <span className="badge" style={{background: '#ffd7d7', color: '#a00'}}>
                    {p.user_missing ? 'User missing/inactive' : 'Org disabled'}
                  </span>
                )}
              </div>
              <div>{p.type}</div>
              <div>{(p.capabilities || []).join(', ') || '—'}</div>
              <div className="muted">{formatDate(p.created_at)}</div>
              <div className="table__actions" style={{display: 'flex', gap: 6}}>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setEditing(p);
                    setFormUser(p.user_id);
                    setFormType(p.type);
                    setFormCaps((p.capabilities || []).join(', '));
                    setFormErr(null);
                    setFormOpen(true);
                  }}>
                  Edit
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Remove this profile?')) return;
                    setSaving(true);
                    try {
                      await api.deleteOrgProfile(orgId, p.id);
                      await load();
                    } catch (err: any) {
                      setFormErr(err?.message ?? 'Failed to delete profile.');
                    } finally {
                      setSaving(false);
                    }
                  }}>
                  Remove
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    setActivityProfile(p);
                    setActivity(null);
                    setActivityError(null);
                    setActivityLoading(true);
                    try {
                      const res = await api.getOrgProfileActivity(orgId, p.id);
                      setActivity(res);
                    } catch (err: any) {
                      setActivityError(err?.message ?? 'Failed to load activity.');
                    } finally {
                      setActivityLoading(false);
                    }
                  }}>
                  View activity
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    setReportProfile(p);
                    setReport(null);
                    setReportError(null);
                    setReportLoading(true);
                    try {
                      const res = await api.getWorkerReport(orgId, p.id, {});
                      setReport(res);
                    } catch (err: any) {
                      setReportError(err?.message ?? 'Failed to load report.');
                    } finally {
                      setReportLoading(false);
                    }
                  }}>
                  Worker report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="card" style={{marginTop: 12}}>
          <h4>{editing ? 'Edit profile' : 'New profile'}</h4>
          <div className="form">
            <label className="form__field">
              <span>User email / ID</span>
              <input
                value={formUser}
                onChange={e => setFormUser(e.target.value)}
                disabled={!!editing}
                placeholder="user@example.com"
              />
            </label>
            <label className="form__field">
              <span>Profile type</span>
              <input value={formType} onChange={e => setFormType(e.target.value)} placeholder="admin, auditor, etc." />
            </label>
            <label className="form__field">
              <span>Capabilities (comma-separated)</span>
              <input
                value={formCaps}
                onChange={e => setFormCaps(e.target.value)}
                placeholder="read,write,manage_receivers"
              />
            </label>
            {formErr ? <div className="form__error">{formErr}</div> : null}
            <div className="form__field" style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {presets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setFormCaps(preset.caps.join(', '));
                    if (!formType) setFormType(preset.label.split(' ')[0].toLowerCase());
                  }}>
                  Use {preset.label}
                </button>
              ))}
            </div>
            <div style={{display: 'flex', gap: 8}}>
              <button className="primary" type="button" disabled={saving} onClick={async () => {
                setSaving(true);
                setFormErr(null);
                const caps = formCaps
                  .split(',')
                  .map(c => c.trim())
                  .filter(Boolean);
                try {
                  if (editing) {
                    await api.updateOrgProfile(orgId, editing.id, {
                      type: formType,
                      capabilities: caps,
                    });
                  } else {
                    await api.createOrgProfile(orgId, {
                      user_id: formUser,
                      type: formType,
                      capabilities: caps,
                    });
                  }
                  setFormOpen(false);
                  await load();
                } catch (err: any) {
                  setFormErr(err?.message ?? 'Failed to save profile.');
                } finally {
                  setSaving(false);
                }
              }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="secondary" type="button" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

          {activityProfile ? (
            <div className="card" style={{marginTop: 12}}>
              <h4>
                Activity for {activityProfile.user_id} ({activityProfile.type})
              </h4>
              <div className="form__field" style={{display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'}}>
                <strong>Worker capabilities</strong>
                <label style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                  <input
                    type="checkbox"
                    checked={(activityProfile.capabilities || []).includes('shift')}
                    onChange={async e => {
                      setCapSaving(true);
                      try {
                        const caps = new Set(activityProfile.capabilities || []);
                        if (e.target.checked) caps.add('shift');
                        else caps.delete('shift');
                        await api.updateOrgProfile(orgId, activityProfile.id, {capabilities: Array.from(caps)});
                        await load();
                      } catch (err: any) {
                        setActivityError(err?.message ?? 'Failed to update capabilities.');
                      } finally {
                        setCapSaving(false);
                      }
                    }}
                    disabled={capSaving}
                  />
                  <span>Shift tracking enabled</span>
                </label>
                <label style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                  <input
                    type="checkbox"
                    checked={(activityProfile.capabilities || []).includes('breaks')}
                    onChange={async e => {
                      setCapSaving(true);
                      try {
                        const caps = new Set(activityProfile.capabilities || []);
                        if (e.target.checked) caps.add('breaks');
                        else caps.delete('breaks');
                        await api.updateOrgProfile(orgId, activityProfile.id, {capabilities: Array.from(caps)});
                        await load();
                      } catch (err: any) {
                        setActivityError(err?.message ?? 'Failed to update capabilities.');
                      } finally {
                        setCapSaving(false);
                      }
                    }}
                    disabled={capSaving}
                  />
                  <span>Breaks enabled</span>
                </label>
                <button
                  className="link"
                  type="button"
                  onClick={() => window.location.assign('/system-settings')}>
                  View shift policies
                </button>
              </div>
              {activityLoading ? (
                <LoadingState message="Loading activity..." />
              ) : activityError ? (
                <ErrorState message={activityError} onRetry={() => setActivityProfile(null)} />
              ) : activity ? (
            <div className="stack" style={{display: 'grid', gap: 12}}>
              <div>
                <h5>Recent presence logs</h5>
                {activity.presence_logs && activity.presence_logs.length > 0 ? (
                  <div className="table">
                    <div className="table__row table__head">
                      <div>Time</div>
                      <div>Receiver</div>
                      <div>Result</div>
                      <div>Token prefix</div>
                    </div>
                    {activity.presence_logs.map((log: any) => (
                      <div className="table__row" key={log.id}>
                        <div className="muted">{formatDate(log.server_timestamp)}</div>
                        <div>{log.receiver_id}</div>
                        <div>{log.auth_result}</div>
                        <div>{log.token_prefix}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No presence logs.</div>
                )}
              </div>
              {activity.student_attendance ? (
                <div>
                  <h5>Recent course attendance</h5>
                  <div className="muted">No course attendance data yet.</div>
                </div>
              ) : null}
              {activity.worker_shifts ? (
                <div>
                  <h5>Recent shifts</h5>
                  <div className="muted">Shift tracking not implemented yet.</div>
                </div>
              ) : null}
              {activity.worker_breaks ? (
                <div>
                  <h5>Recent breaks</h5>
                  <div className="muted">Break tracking not implemented yet.</div>
                </div>
              ) : null}
              <button className="secondary" type="button" onClick={() => setActivityProfile(null)}>
                Close
              </button>
            </div>
          ) : (
            <div className="muted">Select a profile to load activity.</div>
          )}
        </div>
      ) : null}

      {reportProfile ? (
        <div className="card" style={{marginTop: 12}}>
          <div className="table__header">
            <div>
              <h4>
                Worker report for {reportProfile.user_id} ({reportProfile.type})
              </h4>
              {report?.range ? (
                <p className="muted">
                  Range: {formatDate(report.range.from)} → {formatDate(report.range.to)}
                </p>
              ) : null}
            </div>
            <div className="actions" style={{gap: 8}}>
              <button
                className="secondary"
                type="button"
                onClick={async () => {
                  if (!reportProfile) return;
                  setReportLoading(true);
                  setReportError(null);
                  try {
                    const res = await api.getWorkerReport(orgId, reportProfile.id, {});
                    setReport(res);
                  } catch (err: any) {
                    setReportError(err?.message ?? 'Failed to load report.');
                  } finally {
                    setReportLoading(false);
                  }
                }}>
                Refresh
              </button>
              <button
                className="primary"
                type="button"
                onClick={async () => {
                  if (!reportProfile) return;
                  try {
                    const csv = await api.getWorkerReport(orgId, reportProfile.id, {format: 'csv'});
                    const blob = new Blob([csv as string], {type: 'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `worker_report_${reportProfile.id}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err: any) {
                    setReportError(err?.message ?? 'Failed to export CSV.');
                  }
                }}>
                Export CSV
              </button>
              <button className="secondary" type="button" onClick={() => setReportProfile(null)}>
                Close
              </button>
            </div>
          </div>
          {reportLoading ? (
            <LoadingState message="Building report..." />
          ) : reportError ? (
            <ErrorState message={reportError} onRetry={() => setReportProfile(null)} />
          ) : report ? (
            <div className="stack" style={{display: 'grid', gap: 12}}>
              <div className="table" style={{maxWidth: 720}}>
                <div className="table__row table__head">
                  <div>Metric</div>
                  <div>Value</div>
                </div>
                <div className="table__row">
                  <div>Total hours</div>
                  <div>{(report.totals?.total_hours ?? 0).toFixed(2)}h</div>
                </div>
                <div className="table__row">
                  <div>Total breaks</div>
                  <div>{formatSeconds(report.totals?.total_break_seconds)}</div>
                </div>
              </div>
              <div>
                <h5>Daily hours (last 30 days)</h5>
                {report.daily_hours?.length ? (
                  <div className="table">
                    <div className="table__row table__head">
                      <div>Date</div>
                      <div>Hours</div>
                    </div>
                    {report.daily_hours.map((d: any) => (
                      <div className="table__row" key={d.label}>
                        <div>{d.label}</div>
                        <div>{(d.seconds / 3600).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No shifts in range.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="muted">Select a profile to load report.</div>
          )}
        </div>
      ) : null}
    </Card>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const formatSeconds = (seconds?: number) => {
  if (!seconds || Number.isNaN(seconds)) return '—';
  const mins = Math.round(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
};

export default UserProfilesTab;
