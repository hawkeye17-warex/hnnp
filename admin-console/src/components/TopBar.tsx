import React from 'react';

import {useTheme} from '../theme/ThemeProvider';
import {useAuth} from '../context/AuthContext';
import {useNavigate} from 'react-router-dom';

const TopBar = () => {
  const {theme, mode, toggle} = useTheme();
  const {colors} = theme;
  const {logout} = useAuth();
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
        Org: NearID Labs
      </div>
      <button className="secondary" onClick={toggle}>
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
