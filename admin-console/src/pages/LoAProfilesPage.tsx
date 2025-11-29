import React, {useMemo, useState} from 'react';
import SectionCard from '../components/ui/SectionCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import InfoTooltip from '../components/InfoTooltip';
import {useLoAProfiles} from '../hooks/useLoAProfiles';

const USE_CASES = ['attendance', 'access_control', 'exam_proctoring', 'restricted_zone'];

const LoAProfilesPage: React.FC = () => {
  const {profiles, assignments, loading, error, updateAssignments} = useLoAProfiles();
  const [saving, setSaving] = useState(false);
  const assignmentMap = useMemo(() => {
    const m: Record<string, string> = {};
    assignments.forEach(a => {
      m[a.use_case] = a.loa_profile_id;
    });
    return m;
  }, [assignments]);

  const [selected, setSelected] = useState<Record<string, string>>(assignmentMap);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(selected)
        .filter(([, profileId]) => profileId)
        .map(([use_case, loa_profile_id]) => ({use_case, loa_profile_id}));
      await updateAssignments(payload);
    } catch {
      // errors handled in hook
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading LoA profiles..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
        LoA Profiles <InfoTooltip label="Level of Assurance profiles define how strongly we verify identity for each use case." />
      </h1>

      <SectionCard title="Profiles">
        {profiles.length === 0 ? (
          <div className="text-sm text-slate-600">No LoA profiles configured.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {profiles.map(p => (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="text-slate-600 text-xs">
                  Requirements: {p.requirements ? JSON.stringify(p.requirements) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Assignments">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-4">Use case</th>
                <th className="py-2 pr-4">LoA</th>
              </tr>
            </thead>
            <tbody>
              {USE_CASES.map(useCase => (
                <tr key={useCase} className="border-b last:border-0">
                  <td className="py-2 pr-4 capitalize">{useCase.replace('_', ' ')}</td>
                  <td className="py-2 pr-4">
                    <select
                      className="input"
                      value={selected[useCase] ?? assignmentMap[useCase] ?? ''}
                      onChange={e =>
                        setSelected(prev => ({
                          ...prev,
                          [useCase]: e.target.value,
                        }))
                      }>
                      <option value="">—</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save assignments'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
};

export default LoAProfilesPage;
