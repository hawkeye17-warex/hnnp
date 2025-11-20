import React from 'react';
import {NavLink, Outlet} from 'react-router-dom';

import {useTheme} from '../theme/ThemeProvider';

const navItems = [
  {to: '/overview', label: 'Overview'},
  {to: '/receivers', label: 'Receivers'},
  {to: '/presence', label: 'Presence'},
  {to: '/links', label: 'Links'},
  {to: '/org-settings', label: 'Org Settings'},
  {to: '/api', label: 'API'},
];

const MainLayout = () => {
  const {theme} = useTheme();
  const {colors} = theme;

  return (
    <div className="layout" style={{background: colors.pageBg}}>
      <aside
        className="sidebar"
        style={{
          background: colors.sidebarBg,
          color: colors.sidebarText,
          borderColor: colors.cardBorder,
        }}>
        <div className="sidebar__logo" style={{color: colors.accentPrimary}}>
          NearID Admin
        </div>
        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({isActive}) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              style={({isActive}) => ({
                color: isActive ? colors.textPrimary : colors.sidebarText,
                background: isActive ? `${colors.accentPrimary}22` : 'transparent',
              })}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main" style={{background: colors.pageBg}}>
        <header className="topbar" style={{borderColor: colors.cardBorder, background: colors.cardBg}}>
          <div
            className="org-pill"
            style={{
              background: `${colors.accentPrimary}15`,
              color: colors.accentPrimary,
            }}>
            Org: NearID Labs
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
