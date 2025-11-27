import React, {useEffect, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {apiFetch} from '../api/client';

type SecurityConfig = {
  sessionTimeoutMinutes?: number;
  passwordPolicy?: string;
  mfaRequired?: boolean;
};

const SecuritySettingsPage: React.FC = () => {
  const [data, setData] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiFetch<SecurityConfig>('/api/settings/security');
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? 'Failed to load security settings');
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="overview">
      <h1 className="page-title">Security</h1>

      <SectionCard title="Session Security">
        {loading && <LoadingState message="Loading security settings..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && (
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Session timeout</span>
              <span className="font-semibold">
                {data?.sessionTimeoutMinutes ? `${data.sessionTimeoutMinutes} minutes` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Password policy</span>
              <span className="font-semibold">{data?.passwordPolicy ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>MFA required</span>
              <span className="font-semibold">{data?.mfaRequired ? 'Yes' : 'No/Unknown'}</span>
            </div>
            {/* TODO: Add edit controls for security posture (MFA requirements, session lifetimes) when backend supports updates. */}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default SecuritySettingsPage;
