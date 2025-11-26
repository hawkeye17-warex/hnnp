import React from 'react';

export type Incident = {
  time: string;
  description: string;
};

type IncidentListProps = {
  incidents: Incident[];
};

const IncidentList: React.FC<IncidentListProps> = ({incidents}) => {
  if (!incidents.length) {
    return <div className="text-sm text-slate-500">No incidents</div>;
  }

  return (
    <ul className="divide-y divide-slate-200">
      {incidents.map((incident, idx) => (
        <li key={`${incident.time}-${idx}`} className="py-2 flex gap-3">
          <span className="w-28 text-xs text-slate-500 shrink-0">{incident.time}</span>
          <span className="text-sm text-slate-900 truncate">{incident.description}</span>
        </li>
      ))}
    </ul>
  );
};

export default IncidentList;
