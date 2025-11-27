import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { OrgSummary } from "../types/org";

const OrgDetailPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const api = useApi();
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getOrg(orgId);
      setOrg(res as OrgSummary);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load org");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Organization</h1>
          <p className="text-slate-600 text-sm">Org details and configuration.</p>
        </div>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading org...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : !org ? (
          <div className="text-sm text-slate-500">Org not found.</div>
        ) : (
          <>
            <Field label="Org ID" value={org.org_id} />
            <Field label="Name" value={org.org_name} />
            <Field label="Type" value={org.org_type} />
            <Field label="Status" value={org.status ?? "active"} />
            <Field label="Modules" value={org.enabled_modules?.join(", ") ?? "—"} />
            <Field label="Slug" value={org.slug ?? "—"} />
          </>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
    <span className="text-slate-900 font-semibold">{value}</span>
  </div>
);

export default OrgDetailPage;
