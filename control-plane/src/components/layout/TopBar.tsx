import React from "react";
import { useLocation } from "react-router-dom";

const TopBar: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const title = (() => {
    if (location.pathname.startsWith("/orgs")) return "Organizations";
    if (location.pathname.startsWith("/policies")) return "Policies";
    if (location.pathname.startsWith("/loa")) return "LoA Profiles";
    if (location.pathname.startsWith("/logs")) return "Logs";
    if (location.pathname.startsWith("/settings")) return "Settings";
    return "Overview";
  })();

  return (
    <header className="sticky top-0 z-20 h-14 bg-[#161921] text-slate-100 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="lg:hidden h-9 w-9 rounded-md bg-slate-800 text-white flex items-center justify-center focus:outline-none"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span className="h-0.5 w-4 bg-white block mb-1" />
          <span className="h-0.5 w-4 bg-white block mb-1" />
          <span className="h-0.5 w-4 bg-white block" />
        </button>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] text-slate-400">NearID Control Plane</span>
          <span className="text-sm font-semibold tracking-tight">{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
          SA
        </div>
      </div>
    </header>
  );
};

export default TopBar;
