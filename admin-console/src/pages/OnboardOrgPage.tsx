import React, {useMemo, useState} from 'react';
import {MODULE_NAV_ITEMS, ModuleId, OrgType} from '../config/orgModules';

const backendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL;

const ORG_TYPES: OrgType[] = ['school', 'factory', 'office', 'hospital', 'gov', 'other'];
const MODULES: ModuleId[] = [
  'attendance',
  'sessions',
  'quizzes',
  'exams',
  'shifts',
  'workzones',
  'safety',
  'access_control',
  'analytics',
  'hps_insights',
  'developer_api',
];

const PRESETS: Record<OrgType, ModuleId[]> = {
  school: ['attendance', 'sessions', 'quizzes', 'exams', 'analytics', 'hps_insights'],
  factory: ['attendance', 'shifts', 'workzones', 'safety', 'access_control', 'analytics', 'hps_insights'],
  office: ['attendance', 'analytics', 'hps_insights'],
  hospital: ['attendance', 'safety', 'analytics', 'hps_insights', 'access_control'],
  gov: ['attendance', 'analytics', 'hps_insights', 'access_control'],
  other: ['attendance', 'analytics'],
};

const OnboardOrgPage = () => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('office');
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const toggleModule = (m: ModuleId) => {
    setModules(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
  };

  const applyPreset = () => {
    setModules(PRESETS[orgType] ?? []);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendBaseUrl) {
      setError('Backend URL not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrgId(null);
    setApiKey(null);
    setConfirmed(false);
    try {
      const res = await fetch(`${backendBaseUrl}/internal/orgs/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({name, slug, org_type: orgType, enabled_modules: modules}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to create organization');
      }
      const body = await res.json();
      setOrgId(body?.orgId ?? null);
      setApiKey(body?.apiKey ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      alert('Copied API key');
    } catch {
      try {
        // @ts-ignore
        window.prompt('Copy the key (Ctrl+C, Enter):', val);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="overview" style={{maxWidth: 600, margin: '0 auto'}}>
      <div className="card" style={{padding: 24}}>
        <h2>Onboard Organization</h2>
        <p className="muted">Create an organization and generate an admin API key.</p>
        <form className="form" onSubmit={onSubmit}>
          <label className="form__field">
            <span>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </label>
          <label className="form__field">
            <span>Slug</span>
            <input value={slug} onChange={e => setSlug(e.target.value)} required />
          </label>
          <label className="form__field">
            <span>Org type</span>
            <select
              value={orgType}
              onChange={e => setOrgType(e.target.value as OrgType)}
              style={{zIndex: 10, background: '#111827', color: '#e5e7eb'}}>
              {ORG_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="form__field">
            <div className="flex items-center justify-between">
              <span>Enabled modules</span>
              <button type="button" className="secondary" onClick={applyPreset}>
                Apply preset
              </button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8}}>
              {MODULES.map(m => (
                <label key={m} style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <input type="checkbox" checked={modules.includes(m)} onChange={() => toggleModule(m)} />
                  <span>{MODULE_NAV_ITEMS[m]?.label ?? m}</span>
                </label>
              ))}
            </div>
          </div>
          {error ? <div className="form__error">{error}</div> : null}
          <div style={{marginTop: 12}}>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create organization'}
            </button>
          </div>
        </form>
        {orgId && apiKey ? (
          <div style={{marginTop: 16}}>
            <h4>Organization created</h4>
            <div className="muted">Org ID</div>
            <div style={{marginBottom: 8}}>{orgId}</div>
            <div className="muted">API Key (one-time display)</div>
            <div
              className="code-block"
              style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
              <code style={{whiteSpace: 'break-spaces'}}>{apiKey}</code>
              <button className="secondary" type="button" onClick={() => copy(apiKey)}>
                Copy
              </button>
            </div>
            <div className="muted" style={{fontSize: 12, marginTop: 4}}>
              This key will not be shown again. Store it securely. If you lose it, generate a new
              one later.
            </div>
          <div style={{marginTop: 12}}>
            <button
              className="primary"
              type="button"
              onClick={() => {
                setConfirmed(true);
                const params = new URLSearchParams();
                if (orgId) params.set('org', orgId);
                window.location.href = `/login${params.toString() ? `?${params.toString()}` : ''}`;
              }}
              disabled={confirmed}>
              {confirmed ? 'Saved' : 'I have copied this key'}
            </button>
          </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OnboardOrgPage;
