import React from "react";
import { Link, useLocation } from "react-router-dom";

const nav = [
  { label: "Overview", to: "/overview" },
  { label: "Organizations", to: "/orgs" },
  { label: "Policies", to: "/policies" },
  { label: "LoA Profiles", to: "/loa" },
  { label: "Logs", to: "/logs" },
  { label: "Settings", to: "/settings" },
];

const CPSidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const location = useLocation();

  return (
    <aside
      className={`bg-[#111318] text-slate-100 w-64 flex-shrink-0 border-r border-slate-800 fixed lg:static inset-y-0 z-30 transform ${
        open ? "translate-x-0" : "-translate-x-full"
      } transition-transform lg:translate-x-0`}
    >
      <div className="h-14 flex items-center px-4 border-b border-slate-800 text-sm font-semibold">
        NearID Control Plane
      </div>
      <nav className="p-3 space-y-1 text-sm">
        {nav.map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`flex items-center px-3 py-2 rounded-md hover:bg-slate-800 transition ${
                active ? "bg-slate-800 text-white" : "text-slate-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default CPSidebar;
