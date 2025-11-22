import React, {useEffect, useState} from 'react';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import {useApi} from '../api/client';
import TextInput from '../components/form/TextInput';
import SubmitButton from '../components/form/SubmitButton';
import {useToast} from '../hooks/useToast';

type Props = { org?: any; onUpdate?: () => void };

const OrgSettingsPage = ({org: initialOrg, onUpdate}: Props) => {
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
        const data = initialOrg ?? (await api.getOrg());
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
  }, [api, initialOrg]);

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
      await api.updateOrganization(payload, org?.id);
      toast.success('Organization updated');
      const updated = await api.getOrg();
      setOrg(updated);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setSaveErr(err?.message ?? 'Failed to update organization');
      toast.error(saveErr ?? 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'archive' | 'restore'>(null);

  const archiveOrg = async () => {
    if (!org?.id) return;
    setPendingAction('archive');
    setConfirmOpen(true);
  };

  const restoreOrg = async () => {
    if (!org?.id) return;
    setPendingAction('restore');
    setConfirmOpen(true);
  };

  const executePending = async () => {
    if (!pendingAction || !org?.id) return;
    setConfirmOpen(false);
    setActionLoading(true);
    try {
      if (pendingAction === 'archive') {
        await api.updateOrganization({status: 'archived'}, org.id);
        toast.success('Organization archived');
      } else {
        await api.updateOrganization({status: 'active'}, org.id);
        toast.success('Organization restored');
      }
      const updated = await api.getOrg();
      setOrg(updated);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update organization');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
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
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm">
        <div>
          <p>
            {pendingAction === 'archive'
              ? 'Archive this organization? It will be soft-deleted and can be restored later.'
              : 'Restore this archived organization?'}
          </p>
          <div style={{display: 'flex', gap: 8}}>
            <button className="secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className="primary" onClick={executePending} disabled={actionLoading}>{actionLoading ? 'Working…' : 'Confirm'}</button>
          </div>
        </div>
      </Modal>
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
