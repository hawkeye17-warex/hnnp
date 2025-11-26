import React from 'react';
import SectionCard from '../components/ui/SectionCard';
import {useOrgConfig} from '../hooks/useOrgConfig';
import {useNotificationSettings} from '../hooks/useNotificationSettings';

const SettingsPage: React.FC = () => {
  const {data: orgConfig, isLoading: orgLoading, error: orgError} = useOrgConfig();
  const {
    data: notificationSettings,
    isLoading: notifLoading,
    error: notifError,
    savingKey,
    updateSetting,
  } = useNotificationSettings();

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      <SectionCard title="Organization">
        {orgLoading ? (
          <div className="text-sm text-slate-500">Loading organization settings...</div>
        ) : orgError ? (
          <div className="text-sm text-red-600">{orgError}</div>
        ) : !orgConfig ? (
          <div className="text-sm text-slate-500">No organization settings available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-800">
            <Field label="Organization name" value={orgConfig.name ?? '—'} />
            <Field label="Organization ID" value={orgConfig.id ?? '—'} />
            <Field label="Timezone" value={orgConfig.timezone ?? '—'} />
            <Field label="Contact email" value={orgConfig.contactEmail ?? '—'} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Notifications">
        {notifLoading ? (
          <div className="text-sm text-slate-500">Loading notification settings...</div>
        ) : notifError ? (
          <div className="text-sm text-red-600">{notifError}</div>
        ) : !notificationSettings ? (
          <div className="text-sm text-slate-500">No notification settings available.</div>
        ) : (
          <div className="space-y-3 text-sm text-slate-800">
            {Object.entries(mapNotificationLabels(notificationSettings)).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 bg-white">
                <span className="font-semibold text-slate-900">{label}</span>
                <label className="inline-flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={Boolean(notificationSettings[key])}
                    disabled={savingKey === key}
                    onChange={e => updateSetting(key, e.target.checked)}
                  />
                  <span className="text-xs text-slate-600">
                    {savingKey === key ? 'Saving...' : Boolean(notificationSettings[key]) ? 'On' : 'Off'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Danger zone">
        <div className="space-y-3 text-sm text-slate-800">
          <p className="text-slate-600">
            Data export and deletion actions will appear here. Use with caution.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-slate-200 text-slate-700 cursor-not-allowed"
              disabled>
              Export data (coming soon)
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-red-200 text-red-700 cursor-not-allowed"
              disabled>
              Delete org (coming soon)
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

const Field = ({label, value}: {label: string; value: string}) => (
  <div className="flex flex-col">
    <span className="text-slate-500 text-xs uppercase tracking-wide">{label}</span>
    <span className="text-slate-900 font-semibold">{value}</span>
  </div>
);

const mapNotificationLabels = (settings: Record<string, boolean | undefined>) => {
  const labels: Record<string, string> = {
    incidentAlerts: 'Incident alerts',
    receiverOfflineAlerts: 'Receiver offline alerts',
    hpsAnomalyAlerts: 'HPS anomaly alerts',
  };
  // Include any extra keys returned by backend
  Object.keys(settings).forEach(key => {
    if (!labels[key]) labels[key] = key;
  });
  return labels;
};

export default SettingsPage;
