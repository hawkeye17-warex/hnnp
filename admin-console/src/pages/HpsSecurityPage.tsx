import React, {useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import {useHpsStats} from '../hooks/useHpsStats';
import {useHpsPolicy} from '../hooks/useHpsPolicy';

const HpsSecurityPage: React.FC = () => {
  const {data: stats, isLoading: statsLoading, error: statsError} = useHpsStats();
  const {data: policy, isLoading: policyLoading, error: policyError, save, reload} = useHpsPolicy();
  const [saving, setSaving] = useState(false);

  const verificationRate = stats.find(s => s.label?.toLowerCase().includes('verification'))?.value ?? '—';
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
        {policyLoading ? (
          <div className="text-sm text-slate-500">Loading HPS policy...</div>
        ) : policyError ? (
          <div className="text-sm text-red-600">{policyError}</div>
        ) : !policy ? (
          <div className="text-sm text-slate-500">No policy data available.</div>
        ) : (
          <div className="space-y-4 text-sm text-slate-800">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-900">Min score for auto-accept</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                defaultValue={policy.min_score}
                onBlur={e => saveField({min_score: Number(e.target.value) || policy.min_score})}
                className="w-32 px-3 py-2 rounded-md border border-slate-300 bg-white"
              />
            </div>

            <ToggleRow
              label="Allow fallback gesture"
              checked={!!policy.allow_fallback_gesture}
              onChange={val => saveField({allow_fallback_gesture: val})}
            />
            <ToggleRow
              label="Require HPS for attendance"
              checked={!!policy.require_hps_for_attendance}
              onChange={val => saveField({require_hps_for_attendance: val})}
            />
            <ToggleRow
              label="Require HPS for access"
              checked={!!policy.require_hps_for_access}
              onChange={val => saveField({require_hps_for_access: val})}
            />

            <div className="text-xs text-slate-500">
              Last updated by {policy.updated_by ?? '—'} at{' '}
              {policy.updated_at ? new Date(policy.updated_at).toLocaleString() : '—'}
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={reload}
                className="inline-flex px-4 py-2 rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 text-sm">
                Refresh
              </button>
              {saving && <span className="text-xs text-slate-500">Saving…</span>}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );

  function saveField(partial: any) {
    setSaving(true);
    save(partial)
      .catch(() => {
        // errors surface via hook error
      })
      .finally(() => setSaving(false));
  }
};

const formatNumber = (val: number | string) => {
  if (val === '—') return val;
  const num = typeof val === 'string' ? Number(val) : val;
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString();
};

type ToggleRowProps = {label: string; checked: boolean; onChange: (val: boolean) => void};
const ToggleRow = ({label, checked, onChange}: ToggleRowProps) => (
  <label className="flex items-center justify-between gap-3">
    <span className="font-semibold text-slate-900">{label}</span>
    <input
      type="checkbox"
      className="h-4 w-4 accent-blue-600"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
  </label>
);

export default HpsSecurityPage;
