import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {supabase} from '../api/api';
import SubmitButton from '../components/form/SubmitButton';
import TextInput from '../components/form/TextInput';
import {useAuth} from '../context/AuthContext';

const ResetPasswordPage = () => {
  const {session} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = location.hash || '';
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('access_token');
    if (token) {
      supabase.auth.setSession({access_token: token, refresh_token: token}).catch(err => {
        console.error('Failed to set Supabase session from token', err);
      });
    }
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const {error: updateError} = await supabase.auth.updateUser({password});
      if (updateError) throw updateError;
      setSuccess(true);
      navigate('/dashboard', {replace: true});
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">NearID Admin</div>
        <h1>Reset password</h1>
        <p>Set a new password for your account.</p>
        <form className="form" onSubmit={handleSubmit}>
          <TextInput
            label="New password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <TextInput
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="••••••••"
          />
          {error ? <div className="form__error">{error}</div> : null}
          {success ? (
            <div className="muted" style={{color: 'var(--color-accent-success)'}}>
              Password updated successfully.
            </div>
          ) : null}
          <SubmitButton loading={loading} label="Update password" loadingLabel="Updating..." />
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
