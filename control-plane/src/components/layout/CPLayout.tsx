import React, { useState } from "react";
import CPSidebar from "./CPSidebar";
import TopBar from "./TopBar";

const CPLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <CPSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="p-6 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default CPLayout;
