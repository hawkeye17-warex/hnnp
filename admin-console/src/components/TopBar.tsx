import React from 'react';
import {useNavigate} from 'react-router-dom';

import {useTheme} from '../theme/ThemeProvider';
import {useAuth} from '../context/AuthContext';
import {useSession} from '../hooks/useSession';

const TopBar = () => {
  const {theme, mode, toggle} = useTheme();
  const {colors} = theme;
  const {logout} = useAuth();
  const {session} = useSession();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-slate-900 text-slate-100 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="text-sm font-semibold">NearID Console (Single Org)</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-300">Org: {session?.orgId ?? 'Not set'}</span>
        <button className="secondary text-xs" onClick={toggle} aria-label="Toggle theme">
          {mode === 'dark' ? 'Light' : 'Dark'}
        </button>
        <button
          className="secondary text-xs"
          onClick={() => {
            logout();
            navigate('/login', {replace: true});
          }}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default TopBar;
