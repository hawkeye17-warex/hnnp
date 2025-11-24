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
  email_from: string;
  email_template_subject: string;
  email_template_body: string;
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
            <span>Email from</span>
            <input
              type="email"
              value={settings.email_from}
              onChange={e => setSettings({...settings, email_from: e.target.value})}
              placeholder="hnnp.nearid@gmail.com"
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
            <span>Email body (supports basic placeholders like {{org_name}})</span>
            <textarea
              rows={6}
              value={settings.email_template_body}
              onChange={e => setSettings({...settings, email_template_body: e.target.value})}
            />
          </label>
          <div className="muted" style={{fontSize: 12}}>
            Emails should be sent from hnnp.nearid@gmail.com to the target organization’s contact email using this
            template.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemSettingsPage;
