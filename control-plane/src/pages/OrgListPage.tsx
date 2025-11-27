import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { OrgSummary } from "../types/org";

const OrgListPage: React.FC = () => {
  const api = useApi();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listOrgs();
      const items = Array.isArray(res?.data) ? res.data : (res as any)?.data ?? res ?? [];
      setOrgs(items as OrgSummary[]);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load orgs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Organizations</h1>
          <p className="text-slate-600 text-sm">Manage all organizations.</p>
        </div>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {isLoading ? (
          <div className="p-4 text-sm text-slate-500">Loading organizations...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : orgs.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No organizations found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-5 text-xs font-semibold text-slate-500 px-4 py-2">
              <span>Name</span>
              <span>Type</span>
              <span>Status</span>
              <span>Modules</span>
              <span className="text-right">Action</span>
            </div>
            {orgs.map((org) => (
              <div key={org.org_id} className="grid grid-cols-1 md:grid-cols-5 gap-2 px-4 py-3 text-sm text-slate-800">
                <span className="font-semibold">{org.org_name}</span>
                <span className="text-slate-600 capitalize">{org.org_type}</span>
                <span className="text-slate-600">{org.status ?? "active"}</span>
                <span className="text-slate-600 truncate">{org.enabled_modules?.join(", ") ?? "—"}</span>
                <span className="md:text-right">
                  <Link to={`/orgs/${org.org_id}`} className="text-blue-600 hover:text-blue-800 font-semibold">
                    View
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgListPage;
