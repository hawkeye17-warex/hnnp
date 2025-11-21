import React, {useState} from 'react';
import {Navigate} from 'react-router-dom';

import {supabase} from '../api/api';
import TextInput from '../components/form/TextInput';
import SubmitButton from '../components/form/SubmitButton';
import {useAuth} from '../context/AuthContext';

const ForgotPasswordPage = () => {
  const {session} = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const {error: resetError} = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/supabase-login`,
      });
      if (resetError) {
        throw resetError;
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">NearID Admin</div>
        <h1>Forgot password</h1>
        <p>We will send you a password reset link.</p>
        <form className="form" onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          {sent ? (
            <div className="muted" style={{color: 'var(--color-accent-success)'}}>
              Reset link sent. Check your inbox.
            </div>
          ) : null}
          {error ? <div className="form__error">{error}</div> : null}
          <SubmitButton loading={loading} label="Send reset link" loadingLabel="Sending..." />
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
