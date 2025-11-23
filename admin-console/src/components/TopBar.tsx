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
    <header
      className="topbar"
      style={{borderColor: colors.cardBorder, background: colors.cardBg}}>
      <div
        className="org-pill"
        style={{
          background: `${colors.accentPrimary}15`,
          color: colors.accentPrimary,
        }}>
        Org: {session?.orgId ?? 'Not set'}
      </div>
      <button className="secondary" onClick={() => navigate('/organizations')}>
        Switch org
      </button>
      <button className="secondary" onClick={toggle} aria-label="Toggle theme">
        {mode === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button
        className="secondary logout-btn"
        onClick={() => {
          logout();
          navigate('/login', {replace: true});
        }}>
        Logout
      </button>
    </header>
  );
};

export default TopBar;
