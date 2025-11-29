import React, {useEffect, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/Modal';
import {apiFetch} from '../api/client';
import {useToast} from '../hooks/useToast';

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  masked: string;
  scopes: string;
  created_at?: string;
  last_used_at?: string;
  revoked_at?: string | null;
};

const DeveloperApiPage: React.FC = () => {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState('admin');
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const json: any = await apiFetch('/api/org/api-keys');
      const raw = Array.isArray(json) ? json : json?.items ?? json ?? [];
      setKeys(raw);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    try {
      const res: any = await apiFetch('/api/org/api-keys', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: newName.trim(), scopes: newScopes}),
      });
      setRawKey(res?.raw_key ?? null);
      setShowSecret(true);
      setNewName('');
      setNewScopes('admin');
      toast.success('API key created');
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this key?')) return;
    try {
      await apiFetch(`/api/org/api-keys/${id}`, {method: 'DELETE'});
      toast.success('API key revoked');
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to revoke key');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Developer API</h1>

      <SectionCard title="API Keys">
        {loading ? (
          <div className="text-sm text-slate-500">Loading keys...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-slate-600">No API keys. Create one below.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-5 text-xs font-semibold text-slate-500 pb-2">
              <span>Name</span>
              <span>Scopes</span>
              <span>Created</span>
              <span>Last used</span>
              <span>Action</span>
            </div>
            {keys.map(k => (
              <div key={k.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 py-2 text-sm text-slate-800">
                <div className="font-semibold">{k.name}</div>
                <div className="text-slate-700">{k.scopes}</div>
                <div className="text-slate-600">
                  {k.created_at ? new Date(k.created_at).toLocaleString() : '—'}
                </div>
                <div className="text-slate-600">
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-slate-500">{k.masked}</span>
                  {!k.revoked_at && (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => handleRevoke(k.id)}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Create API Key">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">Name</span>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="My admin key"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">Scopes</span>
            <input
              className="input"
              value={newScopes}
              onChange={e => setNewScopes(e.target.value)}
              placeholder="admin"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
            onClick={handleCreate}
            disabled={creating}>
            {creating ? 'Creating...' : 'Create key'}
          </button>
        </div>
      </SectionCard>

      <Modal open={showSecret} onClose={() => setShowSecret(false)} title="API key created">
        {rawKey ? (
          <div className="space-y-3 text-sm text-slate-800">
            <p className="text-red-600 font-semibold">Copy this key now. It will not be shown again.</p>
            <div className="rounded border border-slate-300 bg-slate-50 px-3 py-2 font-mono break-all">{rawKey}</div>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
              onClick={() => setShowSecret(false)}>
              I copied it
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-600">No key to show.</div>
        )}
      </Modal>
    </div>
  );
};

export default DeveloperApiPage;
