import React, {useEffect, useState} from 'react';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import {useApi} from '../api/client';
import TextInput from '../components/form/TextInput';
import SubmitButton from '../components/form/SubmitButton';
import {useToast} from '../hooks/useToast';

const OrgSettingsPage = () => {
  const api = useApi();
  const toast = useToast();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getOrg();
        if (mounted) {
          setOrg(data);
          setName(data?.name ?? '');
          setEmail(data?.contact_email ?? data?.contactEmail ?? '');
          setAddress(data?.address ?? '');
          setTimezone(data?.timezone ?? '');
        }
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load org');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErr(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name || undefined,
        contact_email: email || undefined,
        address: address || undefined,
        timezone: timezone || undefined,
      };
      await api.updateOrganization(payload);
      toast.success('Organization updated');
      const updated = await api.getOrg();
      setOrg(updated);
    } catch (err: any) {
      setSaveErr(err?.message ?? 'Failed to update organization');
      toast.error(saveErr ?? 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const archiveOrg = async () => {
    if (!org?.id) return;
    const ok = window.confirm('Archive this organization? This will soft-delete (archive) it.');
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.updateOrganization({status: 'archived'});
      toast.success('Organization archived');
      const updated = await api.getOrg();
      setOrg(updated);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to archive organization');
    } finally {
      setActionLoading(false);
    }
  };

  const restoreOrg = async () => {
    if (!org?.id) return;
    const ok = window.confirm('Restore this archived organization?');
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.updateOrganization({status: 'active'});
      toast.success('Organization restored');
      const updated = await api.getOrg();
      setOrg(updated);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to restore organization');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="overview">
      <Card>
        <h2>Organization</h2>
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : null}
        {org ? (
          <form className="form" onSubmit={onSubmit}>
            <div className="org-grid">
              <div>
                <p className="muted">Org ID</p>
                <p>{org.id ?? '—'}</p>
              </div>
              <div>
                <TextInput label="Name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <p className="muted">Slug</p>
                <p>{org.slug ?? '—'}</p>
              </div>
              <div>
                <p className="muted">Status</p>
                <p>{org.status ?? '—'}</p>
              </div>
              <div>
                <p className="muted">Created</p>
                <p>{formatTime(org.created_at || org.createdAt)}</p>
              </div>
              <div>
                <p className="muted">Updated</p>
                <p>{formatTime(org.updated_at || org.updatedAt)}</p>
              </div>
            </div>

            <div style={{marginTop: 12}}>
              <TextInput
                label="Contact email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <TextInput label="Address" value={address} onChange={e => setAddress(e.target.value)} />
              <TextInput label="Timezone" value={timezone} onChange={e => setTimezone(e.target.value)} />
              {saveErr ? <div className="form__error">{saveErr}</div> : null}
              <div style={{marginTop: 8}}>
                <SubmitButton loading={saving} label="Save changes" />
              </div>
              <div style={{marginTop: 12, display: 'flex', gap: 8, alignItems: 'center'}}>
                {org?.status === 'archived' ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={restoreOrg}
                    disabled={actionLoading}>
                    {actionLoading ? 'Restoring...' : 'Restore organization'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    onClick={archiveOrg}
                    disabled={actionLoading}
                    style={{background: '#c0392b', color: '#fff'}}>
                    {actionLoading ? 'Archiving...' : 'Archive organization'}
                  </button>
                )}
                <div className="muted" style={{fontSize: 12}}>
                  {org?.status === 'archived'
                    ? 'This organization is archived. Restore to re-enable.'
                    : 'Archiving will soft-delete the organization (can be restored).'}
                </div>
              </div>
            </div>
          </form>
        ) : !loading && !error ? (
          <EmptyState message="No org info available." />
        ) : null}
      </Card>
      <Card>
        <h3>Config (read-only)</h3>
        <p className="muted">
          Config updates are read-only in v1. Please contact backend or use future admin features for
          changes.
        </p>
        <pre className="code-block">
          {org?.config ? JSON.stringify(org.config, null, 2) : 'No config available.'}
        </pre>
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

export default OrgSettingsPage;
