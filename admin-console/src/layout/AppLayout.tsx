import React, {useState} from 'react';
import {Outlet} from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen(prev => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-100 text-slate-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="w-64 bg-[#111318]">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/50" onClick={closeMobile} role="presentation" />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onToggleSidebar={toggleMobile} />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
