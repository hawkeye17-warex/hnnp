import React from 'react';
import {NavLink, Outlet} from 'react-router-dom';

const navItems = [
  {to: '/overview', label: 'Overview'},
  {to: '/receivers', label: 'Receivers'},
  {to: '/presence', label: 'Presence'},
  {to: '/links', label: 'Links'},
  {to: '/org-settings', label: 'Org Settings'},
  {to: '/api', label: 'API'},
];

const MainLayout = () => {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__logo">NearID Admin</div>
        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({isActive}) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="org-pill">Org: NearID Labs</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
