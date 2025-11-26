import React, {useCallback, useEffect, useState} from 'react';
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
import UsersTab from './UsersTab';
import UsageDashboard from './UsageDashboard';
import UserProfilesTab from './UserProfilesTab';
import QuizzesTab from './QuizzesTab';
import ShiftsTab from './ShiftsTab';
import LiveShiftsPanel from './LiveShiftsPanel';

const OrganizationDetailsPage = () => {
  const {id} = useParams<{id: string}>();
  const api = useApi();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<
    'overview' | 'receivers' | 'presence' | 'users' | 'profiles' | 'quizzes' | 'shifts' | 'live' | 'usage' | 'settings' | 'keys'
  >('overview');

  const loadOrg = useCallback(async () => {
    if (!id) {
      throw new Error('Organization ID is missing.');
    }
    return api.getOrg(id);
  }, [api, id]);

  useEffect(() => {
    let mounted = true;
    const fetchOrg = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadOrg();
        if (!mounted) return;
        setOrg(data);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? 'Failed to load organization.');
        setOrg(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOrg();
    return () => {
      mounted = false;
    };
  }, [loadOrg]);

  const refreshOrg = async () => {
    try {
      const data = await loadOrg();
      setOrg(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load organization.');
    }
  };

  const orgId = org?.id ?? id;

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
          <ErrorState message={error} onRetry={refreshOrg} />
        </Card>
      </div>
    );
  }

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>{org?.name ?? `Organization ${id}`}</h2>
            <p className="muted">ID: {org?.id ?? id}</p>
          </div>
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
            className={tab === 'usage' ? 'primary' : 'secondary'}
            onClick={() => setTab('usage')}>
            Usage
          </button>
          <button
            className={tab === 'users' ? 'primary' : 'secondary'}
            onClick={() => setTab('users')}>
            Users
          </button>
          <button
            className={tab === 'profiles' ? 'primary' : 'secondary'}
            onClick={() => setTab('profiles')}>
            User Profiles
          </button>
          <button
            className={tab === 'quizzes' ? 'primary' : 'secondary'}
            onClick={() => setTab('quizzes')}>
            Quizzes
          </button>
          <button
            className={tab === 'shifts' ? 'primary' : 'secondary'}
            onClick={() => setTab('shifts')}>
            Shifts
          </button>
          <button
            className={tab === 'live' ? 'primary' : 'secondary'}
            onClick={() => setTab('live')}>
            Live
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
        {tab === 'overview' && <OverviewPage orgId={orgId} />}
        {tab === 'receivers' && <ReceiversPage orgId={orgId} />}
        {tab === 'presence' && <PresencePage orgId={orgId} />}
        {tab === 'usage' && <UsageDashboard orgId={orgId} />}
        {tab === 'users' && <UsersTab orgId={orgId} />}
        {tab === 'profiles' && <UserProfilesTab orgId={orgId} />}
        {tab === 'quizzes' && <QuizzesTab orgId={orgId} />}
        {tab === 'shifts' && <ShiftsTab orgId={orgId} />}
        {tab === 'live' && <LiveShiftsPanel orgId={orgId} />}
        {tab === 'settings' && <OrgSettingsPage org={org} orgId={orgId} onUpdate={refreshOrg} />}
        {tab === 'keys' && <ApiKeysTab org={org} orgId={orgId} />}
      </div>
    </div>
  );
};

export default OrganizationDetailsPage;
