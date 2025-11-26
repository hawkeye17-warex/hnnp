import React from 'react';
import {useLocation} from 'react-router-dom';

const titleMap: Record<string, string> = {
  '/overview': 'Overview',
  '/live': 'Live Presence',
  '/incidents': 'Incidents',
  '/attendance': 'Attendance',
  '/users': 'Users',
  '/groups': 'Groups & Sessions',
  '/locations': 'Locations',
  '/receivers': 'Receivers',
  '/logs': 'Logs',
  '/hps': 'HPS & Security',
  '/integrations': 'API & Integrations',
  '/settings': 'Settings',
};

const TopBar = () => {
  const location = useLocation();
  const title = Object.keys(titleMap).find(path => location.pathname.startsWith(path))
    ? titleMap[Object.keys(titleMap).find(path => location.pathname.startsWith(path)) as string]
    : 'NearID Admin';

  return (
    <header className="sticky top-0 z-20 h-14 bg-[#161921] text-slate-100 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="flex items-center gap-3">
        <span className="px-2 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-200">
          Sandbox
        </span>
        <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
          A
        </div>
      </div>
    </header>
  );
};

export default TopBar;
