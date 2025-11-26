import React from 'react';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import {useHpsStats} from '../hooks/useHpsStats';
import {useHpsConfig} from '../hooks/useHpsConfig';

const HpsSecurityPage: React.FC = () => {
  const {data: stats, isLoading: statsLoading, error: statsError} = useHpsStats();
  const {data: config, isLoading: configLoading, error: configError} = useHpsConfig();

  const verificationRate =
    stats.find(s => s.label?.toLowerCase().includes('verification'))?.value ?? '—';
  const far = stats.find(s => s.label?.toLowerCase().includes('far'))?.value ?? '—';
  const frr = stats.find(s => s.label?.toLowerCase().includes('frr'))?.value ?? '—';

  return (
    <div className="bg-slate-100 min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">HPS & Security</h1>

      <SectionCard title="HPS Overview">
        {statsLoading ? (
          <div className="text-sm text-slate-500">Loading HPS metrics...</div>
        ) : statsError ? (
          <div className="text-sm text-red-600">{statsError}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Verification Rate" value={formatNumber(verificationRate)} />
            <StatCard title="Avg FAR estimate" value={formatNumber(far)} />
            <StatCard title="Avg FRR estimate" value={formatNumber(frr)} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Presence Assurance Policy">
        {configLoading ? (
          <div className="text-sm text-slate-500">Loading HPS policy...</div>
        ) : configError ? (
          <div className="text-sm text-red-600">{configError}</div>
        ) : !config ? (
          <div className="text-sm text-slate-500">No policy data available.</div>
        ) : (
          <div className="space-y-3 text-sm text-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-900">Min score for auto-accept</span>
              <span className="text-slate-700">{config.minScore ?? '—'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-900">Micro-gesture fallback</span>
              <span className="text-slate-700">{boolText(config.microGestureFallback)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-900">Required for attendance</span>
              <span className="text-slate-700">{boolText(config.requiredForAttendance)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-900">Required for access</span>
              <span className="text-slate-700">{boolText(config.requiredForAccess)}</span>
            </div>
            <div>
              <button
                type="button"
                className="mt-4 inline-flex px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                Edit policy
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const boolText = (val?: boolean) => (val === undefined ? '—' : val ? 'Enabled' : 'Disabled');

const formatNumber = (val: number | string) => {
  if (val === '—') return val;
  const num = typeof val === 'string' ? Number(val) : val;
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString();
};

export default HpsSecurityPage;
