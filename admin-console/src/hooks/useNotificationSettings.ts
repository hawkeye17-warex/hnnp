import {useCallback, useEffect, useState} from 'react';
import {useSession} from './useSession';

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

  const load = useCallback(async () => {
    if (!session) {
      setError('Not authenticated');
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
      if (!baseUrl) throw new Error('Missing backend base URL');
      const res = await fetch(
        `${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/settings/notifications`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.apiKey}`,
          },
        },
      );
      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `Failed to fetch notification settings (${res.status} ${res.statusText || ''})${
            text ? `: ${text}` : ''
          }`.trim(),
        );
      }
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (!isJson) throw new Error(text || 'Received non-JSON response');
      const json = JSON.parse(text);
      const cfg = json?.settings ?? json ?? null;
      setData(cfg);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load notification settings');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const updateSetting = useCallback(
    async (key: string, value: boolean) => {
      if (!session) {
        setError('Not authenticated');
        return;
      }
      setSavingKey(key);
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        if (!baseUrl) throw new Error('Missing backend base URL');
        const res = await fetch(
          `${baseUrl}/v2/orgs/${encodeURIComponent(session.orgId)}/settings/notifications`,
          {
            method: 'PATCH',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.apiKey}`,
            },
            body: JSON.stringify({[key]: value}),
          },
        );
        const text = await res.text();
        if (!res.ok) {
          throw new Error(
            `Failed to update notification settings (${res.status} ${res.statusText || ''})${
              text ? `: ${text}` : ''
            }`.trim(),
          );
        }
        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (isJson && text) {
          const json = JSON.parse(text);
          setData(json?.settings ?? json ?? {[key]: value});
        } else {
          setData(prev => ({...(prev ?? {}), [key]: value}));
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to update notification settings');
      } finally {
        setSavingKey(null);
      }
    },
    [session],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {data, isLoading, error, savingKey, updateSetting, reload: load};
}
