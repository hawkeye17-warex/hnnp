import React, {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

import {useSession} from '../hooks/useSession';
import {useTheme} from '../theme/ThemeProvider';

const LoginPage = () => {
  const navigate = useNavigate();
  const {session, setSession} = useSession();
  const {theme} = useTheme();
  const {colors} = theme;
  const [orgId, setOrgId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const allowOfflineFallback = false;

  if (session) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
      if (!baseUrl) {
        throw new Error('Backend URL is not configured.');
      }
      const res = await fetch(`${baseUrl}/v2/orgs/${encodeURIComponent(orgId)}`, {
        method: 'GET',
        headers: {
          'x-hnnp-api-key': apiKey,
        },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Invalid API key for this org.');
        }
        if (res.status === 404) {
          throw new Error('Organization not found.');
        }
        throw new Error('Unable to sign in. Please try again.');
      }
      setSession({orgId, apiKey});
      navigate('/overview', {replace: true});
    } catch (err: any) {
      setError(err?.message ?? 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">NearID Admin</div>
        <h1>Sign in</h1>
        <p>Use your org admin credentials to access the console.</p>
        <form className="form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Org ID</span>
            <input
              type="text"
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
              placeholder="org_123"
              required
              style={{
                borderColor: colors.cardBorder,
                background: colors.cardBg,
                color: colors.textPrimary,
              }}
            />
          </label>
          <label className="form__field">
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk_live_..."
              required
              style={{
                borderColor: colors.cardBorder,
                background: colors.cardBg,
                color: colors.textPrimary,
              }}
            />
          </label>
          {error ? <div className="form__error">{error}</div> : null}
          <button className="primary auth-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
