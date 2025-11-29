import React from 'react';
import {useLocation} from 'react-router-dom';
import {resolveRouteMeta} from '../config/routes';

type Props = {
  onToggleSidebar?: () => void;
};

const TopBar: React.FC<Props> = ({onToggleSidebar}) => {
  const location = useLocation();

  const meta = resolveRouteMeta(location.pathname);
  const title = meta?.title ?? 'NearID Admin';
  const breadcrumb = meta?.section ? `${meta.section} · ${meta.title}` : undefined;

  return (
    <header className="sticky top-0 z-20 h-14 bg-[#161921] text-slate-100 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="lg:hidden h-9 w-9 rounded-md bg-slate-800 text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#161921]"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar">
          <span className="h-0.5 w-4 bg-white block mb-1" />
          <span className="h-0.5 w-4 bg-white block mb-1" />
          <span className="h-0.5 w-4 bg-white block" />
        </button>
        <div className="flex flex-col leading-tight">
          {breadcrumb && <span className="text-[11px] text-slate-400">{breadcrumb}</span>}
          <span className="text-sm font-semibold tracking-tight">{title}</span>
        </div>
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
