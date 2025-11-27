import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { OrgSummary } from "../types/org";

const OrgListPage: React.FC = () => {
  const api = useApi();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("office");
  const [modules, setModules] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listOrgs();
      const items = Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.data ?? res ?? [];
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

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const enabled_modules = modules
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      await api.createOrg({
        org_name: name,
        org_type: orgType,
        enabled_modules,
      });
      setName("");
      setOrgType("office");
      setModules("");
      await load();
    } catch (err: any) {
      setCreateError(err?.message ?? "Failed to create org");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-slate-400 text-sm">Manage all organizations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800">
        {isLoading ? (
          <div className="p-4 text-sm text-slate-400">Loading organizations...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-400">{error}</div>
        ) : orgs.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No organizations found.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-6 text-xs font-semibold text-slate-400 px-4 py-2">
              <span>Name</span>
              <span>Type</span>
              <span>Status</span>
              <span>Created</span>
              <span>Modules</span>
              <span className="text-right">Action</span>
            </div>
            {orgs.map((org) => (
              <div
                key={org.org_id}
                className="grid grid-cols-1 md:grid-cols-6 gap-2 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800 transition"
              >
                <span className="font-semibold">{org.org_name}</span>
                <span className="text-slate-300 capitalize">{org.org_type}</span>
                <span className="text-slate-300">{org.status ?? "active"}</span>
                <span className="text-slate-300">
                  {org.created_at ? new Date(org.created_at).toLocaleDateString() : "-"}
                </span>
                <span className="flex flex-wrap gap-1">
                  {org.enabled_modules?.length
                    ? org.enabled_modules.map((m) => (
                        <span key={m} className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-100">
                          {m}
                        </span>
                      ))
                    : "-"}
                </span>
                <span className="md:text-right">
                  <Link to={`/orgs/${org.org_id}`} className="text-blue-400 hover:text-blue-300 font-semibold">
                    View / Configure
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create Org</h2>
            <p className="text-slate-400 text-sm">Create a new organization.</p>
          </div>
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Org"}
          </button>
        </div>
        {createError && <div className="text-sm text-red-400">{createError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-300">Name</span>
            <input
              className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Org name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-300">Type</span>
            <select
              className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
            >
              <option value="school">School</option>
              <option value="factory">Factory</option>
              <option value="office">Office</option>
              <option value="hospital">Hospital</option>
              <option value="gov">Gov</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-slate-300">Modules (comma separated)</span>
            <input
              className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100"
              value={modules}
              onChange={(e) => setModules(e.target.value)}
              placeholder="attendance, shifts, analytics"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default OrgListPage;
