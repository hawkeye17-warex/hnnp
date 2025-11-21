import React from 'react';
import {Outlet, useLocation, Link} from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import {useTheme} from '../theme/ThemeProvider';

const crumbMap: Record<string, string> = {
  overview: 'Overview',
  receivers: 'Receivers',
  presence: 'Presence Events',
  links: 'Links',
  'org-settings': 'Org Settings',
  api: 'API',
};

const AdminLayout = () => {
  const {theme} = useTheme();
  const {colors} = theme;
  const location = useLocation();

  const crumbs = React.useMemo(() => {
    const path = location.pathname.replace(/^\//, '');
    const parts = path.split('/').filter(Boolean);
    const mapped = parts.map(p => ({segment: p, label: crumbMap[p] ?? p}));
    return mapped.length ? mapped : [{segment: 'overview', label: 'Overview'}];
  }, [location.pathname]);

  return (
    <div className="layout" style={{background: colors.pageBg}}>
      <Sidebar />
      <div className="main" style={{background: colors.pageBg}}>
        <TopBar />
        <div className="breadcrumbs">
          {crumbs.map((c, idx) => {
            const href = '/' + crumbs.slice(0, idx + 1).map(x => x.segment).join('/');
            const isLast = idx === crumbs.length - 1;
            return (
              <span key={c.segment} className="breadcrumb__item">
                {!isLast ? <Link to={href}>{c.label}</Link> : <span>{c.label}</span>}
                {!isLast ? <span className="breadcrumb__sep">/</span> : null}
              </span>
            );
          })}
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
