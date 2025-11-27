import React, {useMemo, useState} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import {OrgConfigProvider, useOrgConfigContext} from '../context/OrgConfigContext';
import {buildSidebarConfig, ROUTE_TO_MODULE} from '../config/orgModules';

const ContentWithConfig = () => {
  const location = useLocation();
  const {orgType, enabledModules, isLoading, error} = useOrgConfigContext();

  const sections = useMemo(() => buildSidebarConfig(orgType as any, enabledModules as any), [orgType, enabledModules]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen(prev => !prev);
  const closeMobile = () => setMobileOpen(false);

  const requiredModule = ROUTE_TO_MODULE[location.pathname];
  const notEnabled = requiredModule && !enabledModules.includes(requiredModule);

  return (
    <div className="flex min-h-screen bg-gray-100 text-slate-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar sections={sections} />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="w-64 bg-[#111318]">
            <Sidebar sections={sections} />
          </div>
          <div className="flex-1 bg-black/50" onClick={closeMobile} role="presentation" />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onToggleSidebar={toggleMobile} />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading org config...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Could not load org config: {error}</div>
          ) : notEnabled ? (
            <div className="text-sm text-slate-700">This module is not enabled for this organization.</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

const AppLayout = () => (
  <OrgConfigProvider>
    <ContentWithConfig />
  </OrgConfigProvider>
);

export default AppLayout;
