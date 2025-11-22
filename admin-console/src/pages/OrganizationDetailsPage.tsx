import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';

import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import OverviewPage from './OverviewPage';
import ReceiversPage from './ReceiversPage';
import PresencePage from './PresencePage';
import OrgSettingsPage from './OrgSettingsPage';
import ApiKeysTab from './ApiKeysTab';

const OrganizationDetailsPage = () => {
  const {id} = useParams<{id: string}>();
  const api = useApi();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'receivers' | 'presence' | 'settings' | 'keys'>('overview');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await api.getOrganizations();
        const orgList = Array.isArray(list) ? list : (list as any)?.data ?? [];
        const found = orgList.find((o: any) => String(o.id) === String(id));
        if (!mounted) return;
        setOrg(found ?? null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load organization.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [api, id]);

  if (loading) {
    return (
      <div className="overview">
        <Card>
          <LoadingState message="Loading organization..." />
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
      <Card>
        <div className="table__header">
          <h2>{org?.name ?? `Organization ${id}`}</h2>
          <p className="muted">ID: {org?.id ?? id}</p>
        </div>
        <div style={{display: 'flex', gap: 8}}>
          <button
            className={tab === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setTab('overview')}>
            Overview
          </button>
          <button
            className={tab === 'receivers' ? 'primary' : 'secondary'}
            onClick={() => setTab('receivers')}>
            Receivers
          </button>
          <button
            className={tab === 'presence' ? 'primary' : 'secondary'}
            onClick={() => setTab('presence')}>
            Presence Logs
          </button>
          <button
            className={tab === 'settings' ? 'primary' : 'secondary'}
            onClick={() => setTab('settings')}>
            Settings
          </button>
          <button
            className={tab === 'keys' ? 'primary' : 'secondary'}
            onClick={() => setTab('keys')}>
            API Keys
          </button>
        </div>
      </Card>

      <div style={{marginTop: 16}}>
        {tab === 'overview' && <OverviewPage />}
        {tab === 'receivers' && <ReceiversPage />}
        {tab === 'presence' && <PresencePage />}
        {tab === 'settings' && <OrgSettingsPage />}
        {tab === 'keys' && <ApiKeysTab />}
      </div>
    </div>
  );
};

export default OrganizationDetailsPage;
