import React, {useEffect, useState} from 'react';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import {useToast} from '../hooks/useToast';

type Settings = {
  presence_expiry_seconds: number;
  rate_limit_per_minute: number;
  log_retention_days: number;
  notification_recipient: string;
  org_notification_email: string;
  email_template_subject: string;
  email_template_body: string;
  alert_receiver_offline: boolean;
  alert_key_rotation: boolean;
  alert_suspicious_activity: boolean;
  default_student_capabilities: string[];
  default_worker_capabilities: string[];
  auto_start_shift_on_presence: boolean;
  auto_end_shift_after_minutes: number;
  allow_manual_clock_in_out: boolean;
  allow_manual_break_edit: boolean;
};

const SystemSettingsPage = () => {
  const api = useApi();
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSystemSettings();
      setSettings((res as any)?.system_settings ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSystemSettings(settings);
      toast.success('Settings updated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading system settings..." />
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card>
        <ErrorState message={error ?? 'Failed to load system settings.'} onRetry={load} />
      </Card>
    );
  }

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>System Settings</h2>
            <p className="muted">Presence expiry, rate limits, log retention, and email templates.</p>
          </div>
          <div className="actions" style={{gap: 8}}>
            <button className="secondary" type="button" onClick={load} disabled={saving}>
              Refresh
            </button>
            <button className="primary" type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="form">
          <label className="form__field">
            <span>Presence expiry (seconds)</span>
            <input
              type="number"
              min={1}
              value={settings.presence_expiry_seconds}
              onChange={e =>
                setSettings({...settings, presence_expiry_seconds: Number(e.target.value) || 0})
              }
            />
          </label>
          <label className="form__field">
            <span>Rate limit (requests per minute)</span>
            <input
              type="number"
              min={1}
              value={settings.rate_limit_per_minute}
              onChange={e =>
                setSettings({...settings, rate_limit_per_minute: Number(e.target.value) || 0})
              }
            />
          </label>
          <label className="form__field">
            <span>Log retention (days)</span>
            <input
              type="number"
              min={1}
              value={settings.log_retention_days}
              onChange={e =>
                setSettings({...settings, log_retention_days: Number(e.target.value) || 0})
              }
            />
          </label>
          <label className="form__field">
            <span>Send alerts to (inbox)</span>
            <input
              type="email"
              value={settings.notification_recipient}
              onChange={e => setSettings({...settings, notification_recipient: e.target.value})}
              placeholder="hnnp.nearid@gmail.com"
            />
          </label>
          <label className="form__field">
            <span>Org notification email (per-org alerts)</span>
            <input
              type="email"
              value={settings.org_notification_email}
              onChange={e => setSettings({...settings, org_notification_email: e.target.value})}
              placeholder="org-contact@example.com"
            />
          </label>
          <label className="form__field">
            <span>Email subject</span>
            <input
              value={settings.email_template_subject}
              onChange={e => setSettings({...settings, email_template_subject: e.target.value})}
            />
          </label>
          <label className="form__field">
            <span>
              Email body (supports basic placeholders like {'{{org_name}}'})
            </span>
            <textarea
              rows={6}
              value={settings.email_template_body}
              onChange={e => setSettings({...settings, email_template_body: e.target.value})}
            />
          </label>
          <div className="form__field">
            <span>Default capabilities for new student profiles</span>
            <input
              value={(settings.default_student_capabilities || []).join(', ')}
              onChange={e =>
                setSettings({
                  ...settings,
                  default_student_capabilities: e.target.value
                    .split(',')
                    .map(v => v.trim())
                    .filter(Boolean),
                })
              }
              placeholder="attendance, quiz"
            />
          </div>
          <div className="form__field">
            <span>Default capabilities for new worker profiles</span>
            <input
              value={(settings.default_worker_capabilities || []).join(', ')}
              onChange={e =>
                setSettings({
                  ...settings,
                  default_worker_capabilities: e.target.value
                    .split(',')
                    .map(v => v.trim())
                    .filter(Boolean),
                })
              }
              placeholder="attendance, shift, breaks"
            />
          </div>
          <div className="muted" style={{fontSize: 12}}>
            Alerts will be delivered to hnnp.nearid@gmail.com by default. You can also set a per-organization
            notification email above. Toggle alert types below.
          </div>
          <div className="form__field" style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <input
                type="checkbox"
                checked={settings.alert_receiver_offline}
                onChange={e => setSettings({...settings, alert_receiver_offline: e.target.checked})}
              />
              <span>Receiver offline alerts</span>
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <input
                type="checkbox"
                checked={settings.alert_key_rotation}
                onChange={e => setSettings({...settings, alert_key_rotation: e.target.checked})}
              />
              <span>Key rotation alerts</span>
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
              <input
                type="checkbox"
                checked={settings.alert_suspicious_activity}
                onChange={e => setSettings({...settings, alert_suspicious_activity: e.target.checked})}
              />
              <span>Suspicious activity alerts</span>
            </label>
          </div>

          <div className="divider" />
          <h3>Shift policies</h3>
          <p className="muted">Configure how shifts and breaks are handled for this organization.</p>
          <label className="form__field" style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <input
              type="checkbox"
              checked={settings.auto_start_shift_on_presence}
              onChange={e => setSettings({...settings, auto_start_shift_on_presence: e.target.checked})}
            />
            <span>Auto-start shift on presence</span>
          </label>
          <label className="form__field">
            <span>Auto-end shift after no presence for (minutes)</span>
            <input
              type="number"
              min={1}
              value={settings.auto_end_shift_after_minutes}
              onChange={e =>
                setSettings({
                  ...settings,
                  auto_end_shift_after_minutes: Number(e.target.value) || 0,
                })
              }
            />
          </label>
          <label className="form__field" style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <input
              type="checkbox"
              checked={settings.allow_manual_clock_in_out}
              onChange={e => setSettings({...settings, allow_manual_clock_in_out: e.target.checked})}
            />
            <span>Allow manual clock-in/clock-out</span>
          </label>
          <label className="form__field" style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <input
              type="checkbox"
              checked={settings.allow_manual_break_edit}
              onChange={e => setSettings({...settings, allow_manual_break_edit: e.target.checked})}
            />
            <span>Allow manual break editing</span>
          </label>
          <MaintenanceSection />
        </div>
      </Card>
    </div>
  );
};

const MaintenanceSection = () => {
  const api = useApi();
  const toast = useToast();
  const [state, setState] = useState<{enabled: boolean; message?: string} | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getMaintenance();
      setState(res);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load maintenance state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!state) return null;

  return (
    <div className="card" style={{marginTop: 16, padding: 12}}>
      <h4>Maintenance mode</h4>
      <p className="muted">Toggle Cloud API maintenance. Requires superadmin key.</p>
      <label style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={async e => {
            setLoading(true);
            try {
              const res = await api.setMaintenance(e.target.checked, state.message);
              setState(res);
              toast.success('Maintenance state updated');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to update maintenance');
            } finally {
              setLoading(false);
            }
          }}
        />
        <span>{state.enabled ? 'Enabled' : 'Disabled'}</span>
      </label>
      <label className="form__field">
        <span>Message</span>
        <input
          value={state.message ?? ''}
          onChange={e => setState({...state, message: e.target.value})}
          onBlur={async e => {
            try {
              const res = await api.setMaintenance(state.enabled, e.target.value);
              setState(res);
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to update message');
            }
          }}
        />
      </label>
      <div className="muted" style={{fontSize: 12}}>
        When enabled, all API calls (except health/maintenance) return 503.
      </div>
      <button className="secondary" type="button" onClick={load} disabled={loading} style={{marginTop: 8}}>
        Refresh maintenance state
      </button>
    </div>
  );
};

export default SystemSettingsPage;
