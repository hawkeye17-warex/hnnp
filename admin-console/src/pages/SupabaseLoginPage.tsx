import React, {useState} from 'react';
import {useNavigate, Navigate} from 'react-router-dom';

import {supabase} from '../api/api';
import SubmitButton from '../components/form/SubmitButton';
import TextInput from '../components/form/TextInput';
import {useAuth} from '../context/AuthContext';

const SupabaseLoginPage = () => {
  const navigate = useNavigate();
  const {session} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const {error: authError} = await supabase.auth.signInWithPassword({email, password});
      if (authError) {
        throw authError;
      }
      navigate('/dashboard', {replace: true});
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">NearID Admin</div>
        <h1>Sign in</h1>
        <p>Use your email and password to continue.</p>
        <form className="form" onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          {error ? <div className="form__error">{error}</div> : null}
          <SubmitButton loading={loading} label="Login" loadingLabel="Signing in..." />
        </form>
      </div>
    </div>
  );
};

export default SupabaseLoginPage;
