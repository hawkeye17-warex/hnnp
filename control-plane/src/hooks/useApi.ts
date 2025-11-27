import { useMemo } from "react";

const getBaseUrl = () => {
  const env = import.meta.env.VITE_BACKEND_BASE_URL;
  if (!env) throw new Error("Missing VITE_BACKEND_BASE_URL");
  return env.replace(/\/$/, "");
};

const getApiKey = () => {
  const env = import.meta.env.VITE_SUPERADMIN_API_KEY;
  if (!env) throw new Error("Missing VITE_SUPERADMIN_API_KEY");
  return env;
};

export function useApi() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const apiKey = useMemo(() => getApiKey(), []);

  const request = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `Request failed (${res.status})`);
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Invalid JSON response");
    }
  };

  const listOrgs = () => request<{ data: any[] }>(`/api/control-plane/orgs`);
  const getOrg = (id: string) => request<any>(`/api/control-plane/orgs/${encodeURIComponent(id)}`);
  const updateOrg = (id: string, body: any) =>
    request<any>(`/api/control-plane/orgs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  const createOrg = (body: any) =>
    request<any>(`/api/control-plane/orgs`, {
      method: "POST",
      body: JSON.stringify(body),
    });

  return { request, listOrgs, getOrg, updateOrg, createOrg };
}
