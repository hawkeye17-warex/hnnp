import {useEffect, useState} from 'react';
import {useSession} from './useSession';
import {apiFetch} from '../api/client';

export type NotificationSettings = {
  incidentAlerts?: boolean;
  receiverOfflineAlerts?: boolean;
  hpsAnomalyAlerts?: boolean;
  [key: string]: boolean | undefined;
};

export function useNotificationSettings() {
  const {session} = useSession();
  const [data, setData] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    if (!session) {
      setError('Not authenticated');
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/settings/notifications`);
      const cfg = json?.settings ?? json ?? null;
      setData(cfg);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load notification settings');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    if (!session) {
      setError('Not authenticated');
      return;
    }
    setSavingKey(key);
    try {
      const json: any = await apiFetch(`/v2/orgs/${encodeURIComponent(session.orgId)}/settings/notifications`, {
        method: 'PATCH',
        body: JSON.stringify({[key]: value}),
      });
      if (json?.settings) setData(json.settings);
      else setData(prev => ({...(prev ?? {}), [key]: value}));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update notification settings');
    } finally {
      setSavingKey(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return {data, isLoading, error, savingKey, updateSetting, reload: load};
}
