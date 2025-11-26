import React from 'react';
import {NavLink} from 'react-router-dom';

import {useTheme} from '../theme/ThemeProvider';

const navItems = [
  {to: '/overview', label: 'Overview'},
  {to: '/live', label: 'Live'},
  {to: '/incidents', label: 'Incidents'},
  {to: '/attendance', label: 'Attendance'},
  {to: '/users', label: 'Users'},
  {to: '/groups', label: 'Groups'},
  {to: '/locations', label: 'Locations'},
  {to: '/receivers', label: 'Receivers'},
  {to: '/logs', label: 'Logs'},
  {to: '/hps', label: 'HPS Security'},
  {to: '/integrations', label: 'Integrations'},
  {to: '/settings', label: 'Settings'},
];

const Sidebar = () => {
  const {theme} = useTheme();
  const {colors} = theme;

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 flex flex-col min-h-screen">
      <div className="px-4 py-6 text-lg font-bold text-blue-400">NearID Admin</div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({isActive}) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
