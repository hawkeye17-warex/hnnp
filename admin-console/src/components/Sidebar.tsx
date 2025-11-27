import React from 'react';
import {NavLink} from 'react-router-dom';
import type {SidebarSection} from '../config/orgModules';

const Sidebar = ({sections}: {sections: SidebarSection[]}) => {
  return (
    <aside className="bg-[#111318] text-slate-200 w-64 shrink-0 min-h-screen flex flex-col">
      <div className="px-5 py-6 flex items-center gap-3 text-lg font-semibold">
        <span className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 font-bold">
          N
        </span>
        <div>
          <div className="text-white leading-5">NearID Command</div>
          <div className="text-xs text-slate-400">Console</div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-6 overflow-y-auto">
        {sections.map(section => (
          <div key={section.title} className="mt-6 first:mt-0">
            <div className="px-2 text-xs uppercase tracking-wide text-slate-400 mb-2">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({isActive}) =>
                    [
                      'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                      'text-slate-200 hover:bg-[#1b1e26] transition-colors',
                      isActive ? 'bg-[#1b1e26] font-semibold text-white shadow-[inset_4px_0_0_0_#3b82f6]' : '',
                    ].join(' ')
                  }>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500 group-hover:bg-slate-300" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
