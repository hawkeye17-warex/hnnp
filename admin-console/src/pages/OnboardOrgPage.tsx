import React, {useState} from 'react';

const backendBaseUrl = import.meta.env.VITE_BACKEND_BASE_URL;

const OnboardOrgPage = () => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

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
        body: JSON.stringify({name, slug}),
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
                onClick={() => setConfirmed(true)}
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
