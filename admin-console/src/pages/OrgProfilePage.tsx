import React from 'react';
import {useOrgConfigContext} from '../context/OrgConfigContext';

const MODULE_DESCRIPTIONS: Record<string, string> = {
  attendance: 'Track presence / attendance.',
  sessions: 'Manage class or session schedules.',
  quizzes: 'Run quizzes.',
  exams: 'Manage exams.',
  shifts: 'Track shifts for workforce.',
  workzones: 'Manage workzones / areas.',
  safety: 'Safety and compliance.',
  access_control: 'Access control and permissions.',
  analytics: 'Analytics and reporting.',
  hps_insights: 'HPS verification insights.',
  developer_api: 'Developer API access.',
};

const OrgProfilePage: React.FC = () => {
  const {config, orgType, enabledModules, isLoading, error} = useOrgConfigContext();

  if (isLoading) return <div className="text-sm text-slate-500">Loading org profile...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Org Profile</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-800">
          <Field label="Org name" value={config?.name ?? '—'} />
          <Field label="Org ID" value={config?.id ?? '—'} />
          <Field label="Org type" value={orgType} />
          <Field label="Modules enabled" value={enabledModules.join(', ') || '—'} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {enabledModules.length === 0 ? (
            <div className="text-slate-600">No modules enabled.</div>
          ) : (
            enabledModules.map(mod => (
              <div key={mod} className="rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-900 capitalize">{mod.replace('_', ' ')}</div>
                <div className="text-slate-600 text-sm">{MODULE_DESCRIPTIONS[mod] ?? 'Enabled'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({label, value}: {label: string; value: string}) => (
  <div className="flex flex-col">
    <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
    <span className="text-slate-900 font-semibold">{value}</span>
  </div>
);

export default OrgProfilePage;
