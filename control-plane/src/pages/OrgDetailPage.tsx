import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { OrgSummary } from "../types/org";

const ORG_TYPES = [
  { value: "school", label: "School" },
  { value: "factory", label: "Factory" },
  { value: "office", label: "Office" },
  { value: "hospital", label: "Hospital" },
  { value: "gov", label: "Gov" },
  { value: "other", label: "Other" },
];

const MODULES = [
  { value: "attendance", label: "Attendance", group: "School" },
  { value: "sessions", label: "Class Sessions", group: "School" },
  { value: "quizzes", label: "Quizzes", group: "School" },
  { value: "exams", label: "Exams", group: "School" },
  { value: "analytics", label: "Analytics", group: "School" },
  { value: "hps_insights", label: "HPS Insights", group: "School" },

  { value: "attendance", label: "Attendance", group: "Factory" },
  { value: "shifts", label: "Shifts", group: "Factory" },
  { value: "workzones", label: "Workzones", group: "Factory" },
  { value: "safety", label: "Safety", group: "Factory" },
  { value: "access_control", label: "Access Control", group: "Factory" },
  { value: "analytics", label: "Analytics", group: "Factory" },
  { value: "hps_insights", label: "HPS Insights", group: "Factory" },

  { value: "access_control", label: "Access Control", group: "Common" },
  { value: "developer_api", label: "Developer API", group: "Common" },
];

const PRESETS: Record<string, string[]> = {
  school: ["attendance", "sessions", "quizzes", "exams", "analytics", "hps_insights"],
  factory: ["attendance", "shifts", "workzones", "safety", "access_control", "analytics", "hps_insights"],
  office: ["attendance", "analytics", "hps_insights"],
  hospital: ["attendance", "safety", "analytics", "hps_insights", "access_control"],
  gov: ["attendance", "analytics", "hps_insights", "access_control"],
  other: ["attendance", "analytics"],
};

const OrgDetailPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const api = useApi();
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orgType, setOrgType] = useState("office");
  const [modules, setModules] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getOrg(orgId);
      const summary = res as OrgSummary;
      setOrg(summary);
      setOrgType(summary.org_type ?? "office");
      setModules(summary.enabled_modules ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load org");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const groupedModules = useMemo(() => {
    const groups: Record<string, { label: string; items: { value: string; label: string }[] }> = {};
    MODULES.forEach((m) => {
      if (!groups[m.group]) groups[m.group] = { label: m.group, items: [] };
      if (!groups[m.group].items.find((i) => i.value === m.value)) {
        groups[m.group].items.push({ value: m.value, label: m.label });
      }
    });
    return groups;
  }, []);

  const toggleModule = (val: string) => {
    setModules((prev) => (prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val]));
  };

  const applyPreset = () => {
    const preset = PRESETS[orgType as keyof typeof PRESETS] ?? [];
    setModules(preset);
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      await api.updateOrg(orgId, {
        org_type: orgType,
        enabled_modules: modules,
      });
      setSaveMessage("Saved successfully");
    } catch (err: any) {
      setError(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organization</h1>
          <p className="text-slate-400 text-sm">Org details and configuration.</p>
        </div>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4 space-y-3">
        {isLoading ? (
          <div className="text-sm text-slate-400">Loading org...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : !org ? (
          <div className="text-sm text-slate-400">Org not found.</div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-400">Org ID</div>
                <div className="text-lg font-semibold text-slate-100">{org.org_id}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Name</div>
                <div className="text-lg font-semibold text-slate-100">{org.org_name}</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 capitalize">
                {orgType}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
              <Field label="Status" value={org.status ?? "active"} />
              <Field label="Slug" value={org.slug ?? "-"} />
            </div>
          </>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Organization Type</h2>
            <p className="text-slate-400 text-sm">Select the org vertical to recommend modules.</p>
          </div>
          <button className="px-3 py-2 rounded-md bg-slate-800 text-slate-200 text-sm border border-slate-700" onClick={applyPreset}>
            Apply recommended preset
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ORG_TYPES.map((t) => (
            <button
              key={t.value}
              className={`px-3 py-2 rounded-md text-sm border ${
                orgType === t.value
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-800 text-slate-200 border-slate-700"
              }`}
              onClick={() => setOrgType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Enabled Modules</h2>
            <p className="text-slate-400 text-sm">Toggle modules available for this org.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-200">
          {Object.entries(groupedModules).map(([group, info]) => (
            <div key={group} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">{info.label}</div>
              <div className="space-y-2">
                {info.items.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-slate-100">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={modules.includes(item.value)}
                      onChange={() => toggleModule(item.value)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saveMessage && <span className="text-sm text-green-400">{saveMessage}</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
    <span className="text-slate-100 font-semibold">{value}</span>
  </div>
);

export default OrgDetailPage;
