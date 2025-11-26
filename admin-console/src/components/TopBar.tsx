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

type Props = {
  onToggleSidebar?: () => void;
};

const TopBar: React.FC<Props> = ({onToggleSidebar}) => {
  const location = useLocation();

  const resolveTitle = () => {
    for (const path of Object.keys(titleMap)) {
      if (location.pathname.startsWith(path)) {
        return titleMap[path];
      }
    }
    return 'NearID Admin';
  };

  const title = resolveTitle();

  return (
    <header className="sticky top-0 z-20 h-14 bg-[#161921] text-slate-100 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="lg:hidden h-9 w-9 rounded-md bg-slate-800 text-white flex items-center justify-center focus:outline-none"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar">
          <span className="h-0.5 w-4 bg-white block mb-1" />
          <span className="h-0.5 w-4 bg-white block mb-1" />
          <span className="h-0.5 w-4 bg-white block" />
        </button>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
      </div>
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
