import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import TextInput from '../components/form/TextInput';
import SubmitButton from '../components/form/SubmitButton';
import Toggle from '../components/form/Toggle';
import {supabase} from '../api/api';
import {useAuth} from '../context/AuthContext';
import {useTheme} from '../theme/ThemeProvider';
import {useToast} from '../hooks/useToast';

type NotificationPrefs = {
  email: boolean;
  push: boolean;
};

const NOTIFY_KEY = 'nearid_notify_prefs';

const readNotify = (): NotificationPrefs => {
  if (typeof window === 'undefined') return {email: false, push: false};
  try {
    const raw = window.localStorage.getItem(NOTIFY_KEY);
    if (!raw) return {email: false, push: false};
    return JSON.parse(raw);
  } catch {
    return {email: false, push: false};
  }
};

const AdminAccountPage = () => {
  const {mode, setMode, toggle} = useTheme();
  const {success, error} = useToast();
  const {currentUser} = useAuth();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notify, setNotify] = useState<NotificationPrefs>(() => readNotify());
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const {data, error: userError} = await supabase.auth.getUser();
        if (userError) throw userError;
        const meta: any = data.user?.user_metadata ?? {};
        setName(meta.name ?? '');
        setAvatarUrl(meta.avatar_url ?? meta.picture ?? '');
      } catch (err) {
        console.warn('Failed to load user profile', err);
      }
    };
    loadUser();
  }, []);

  const saveNotifications = (prefs: NotificationPrefs) => {
    setNotify(prefs);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
    }
  };

  const themeOptions = useMemo(() => ['light', 'dark'] as const, []);

  return (
    <div className="overview">
      <Card>
        <h2>Profile</h2>
        <p className="muted">Update your account details.</p>
        <form
          className="form"
          onSubmit={async e => {
            e.preventDefault();
            setLoadingProfile(true);
            try {
              const {error: updateError} = await supabase.auth.updateUser({
                data: {name, avatar_url: avatarUrl},
              });
              if (updateError) throw updateError;
              success('Profile updated');
            } catch (err: any) {
              error(err?.message ?? 'Failed to update profile.');
            } finally {
              setLoadingProfile(false);
            }
          }}>
          <TextInput
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
          <TextInput
            label="Profile picture URL"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
          <SubmitButton loading={loadingProfile} label="Save profile" loadingLabel="Saving..." />
        </form>
      </Card>

      <Card>
        <h2>Password</h2>
        <p className="muted">Set a new password for your account.</p>
        <form
          className="form"
          onSubmit={async e => {
            e.preventDefault();
            if (password !== confirm) {
              error('Passwords do not match.');
              return;
            }
            setLoadingPassword(true);
            try {
              const {error: updateError} = await supabase.auth.updateUser({password});
              if (updateError) throw updateError;
              await supabase.auth.signOut({scope: 'others'}).catch(() => {});
              success('Password updated');
              setPassword('');
              setConfirm('');
            } catch (err: any) {
              error(err?.message ?? 'Failed to update password.');
            } finally {
              setLoadingPassword(false);
            }
          }}>
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
          <SubmitButton
            loading={loadingPassword}
            label="Update password"
            loadingLabel="Updating..."
          />
        </form>
      </Card>

      <Card>
        <h2>Preferences</h2>
        <div className="form">
          <div className="form__field">
            <span>Theme</span>
            <div className="filters">
              {themeOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`secondary ${mode === opt ? 'badge' : ''}`}
                  onClick={() => setMode(opt)}>
                  {opt === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
              <button type="button" className="secondary" onClick={toggle}>
                Toggle
              </button>
            </div>
          </div>
          <Toggle
            label="Email notifications"
            checked={notify.email}
            onChange={checked => saveNotifications({...notify, email: checked})}
          />
          <Toggle
            label="Push notifications"
            checked={notify.push}
            onChange={checked => saveNotifications({...notify, push: checked})}
          />
        </div>
      </Card>
    </div>
  );
};

export default AdminAccountPage;
