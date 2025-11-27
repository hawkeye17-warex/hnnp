import {STORAGE_KEY} from '../context/AuthContext';

export class ForbiddenError extends Error {}
export class ServerError extends Error {}

export type ApiFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: any;
  signal?: AbortSignal;
  skipAuth?: boolean;
};

let onAuthExpired: (() => void) | null = null;
export const setAuthExpiredHandler = (handler: () => void) => {
  onAuthExpired = handler;
};

const getSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.session ?? null;
  } catch {
    return null;
  }
};

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
  if (!baseUrl) throw new Error('Missing backend base URL');
  const session = getSession();

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (!options.skipAuth) {
    if (!session?.apiKey || !session?.orgId) {
      onAuthExpired?.();
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${session.apiKey}`;
    headers['X-Org-Id'] = session.orgId;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    onAuthExpired?.();
    throw new Error('Session expired');
  }
  if (res.status === 403) {
    throw new ForbiddenError('Forbidden');
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const err = new Error('Rate limited');
    // @ts-ignore
    err.retryAfter = retryAfter;
    throw err;
  }
  if (res.status >= 500) {
    throw new ServerError(`Server error (${res.status})`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson) throw new Error(text || 'Received non-JSON response');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}
