import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

type Props = {
  children: React.ReactNode;
};

const AppLayout = ({children}: Props) => {
  return (
    <div className="flex min-h-screen bg-gray-100 text-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
