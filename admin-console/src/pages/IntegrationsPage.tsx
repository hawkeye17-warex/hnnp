import React from 'react';
import SectionCard from '../components/ui/SectionCard';
import {useIntegrations} from '../hooks/useIntegrations';
import {useApiKeys} from '../hooks/useApiKeys';
import StatusPill from '../components/ui/StatusPill';

const IntegrationsPage: React.FC = () => {
  const {data: integrations, isLoading: loadingIntegrations, error: integrationsError} =
    useIntegrations();
  const {data: apiKeys, isLoading: loadingKeys, error: keysError} = useApiKeys();

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">API & Integrations</h1>

      <SectionCard title="API Access">
        {loadingKeys ? (
          <div className="text-sm text-slate-500">Loading API keys...</div>
        ) : keysError ? (
          <div className="text-sm text-red-600">{keysError}</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-sm text-slate-500">No API keys available.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 text-xs font-semibold text-slate-500 pb-2">
              <span>Name</span>
              <span>Masked key</span>
              <span>Created</span>
              <span>Last used</span>
            </div>
            {apiKeys.map(key => (
              <div
                key={key.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-2 py-3 text-sm text-slate-800">
                <span className="font-semibold">{key.name ?? key.id}</span>
                <span className="text-slate-600">{key.masked ?? '••••••'}</span>
                <span className="text-slate-600">
                  {key.createdAt ? new Date(key.createdAt).toLocaleString() : '—'}
                </span>
                <span className="text-slate-600">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Integrations">
        {loadingIntegrations ? (
          <div className="text-sm text-slate-500">Loading integrations...</div>
        ) : integrationsError ? (
          <div className="text-sm text-red-600">{integrationsError}</div>
        ) : integrations.length === 0 ? (
          <div className="text-sm text-slate-500">No integrations configured.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-5 text-xs font-semibold text-slate-500 pb-2">
              <span>Name</span>
              <span>Type</span>
              <span>Status</span>
              <span>Last sync</span>
              <span className="text-right">Action</span>
            </div>
            {integrations.map(integration => (
              <div
                key={integration.id}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 py-3 text-sm text-slate-800">
                <span className="font-semibold">{integration.name}</span>
                <span className="text-slate-600 capitalize">{integration.type}</span>
                <span>
                  <StatusPill status={mapStatusToPill(integration.status)} />
                </span>
                <span className="text-slate-600">
                  {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : '—'}
                </span>
                <span className="md:text-right">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 font-semibold">
                    View
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Add Integration
          </button>
        </div>
      </SectionCard>
    </div>
  );
};

const mapStatusToPill = (
  status?: string | null,
): 'online' | 'offline' | 'warning' => {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'connected' || normalized === 'active') return 'online';
  if (normalized === 'error') return 'warning';
  if (normalized === 'disabled') return 'offline';
  return 'offline';
};

export default IntegrationsPage;
