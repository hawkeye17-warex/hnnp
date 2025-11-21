import axios, {AxiosError, AxiosInstance, AxiosRequestConfig} from 'axios';
import {createClient, SupabaseClient, Session} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiBaseUrl = import.meta.env.VITE_CLOUD_API_BASE_URL ?? import.meta.env.VITE_BACKEND_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast during startup so env issues surface immediately.
  throw new Error('Missing Supabase env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

if (!apiBaseUrl) {
  throw new Error('Missing API base URL (set VITE_CLOUD_API_BASE_URL or VITE_BACKEND_BASE_URL).');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshingPromise: Promise<string | null> | null = null;

const needsRefresh = (session: Session | null) => {
  if (!session?.expires_at) return false;
  const bufferSeconds = 30;
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at - bufferSeconds <= now;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshingPromise) {
    refreshingPromise = supabase.auth
      .refreshSession()
      .then(({data, error}) => {
        if (error) throw error;
        return data.session?.access_token ?? null;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
};

const getAccessToken = async (): Promise<string | null> => {
  const {data} = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  if (needsRefresh(session)) {
    try {
      const token = await refreshAccessToken();
      return token ?? session.access_token ?? null;
    } catch (err) {
      console.warn('Failed to refresh Supabase session', err);
      return null;
    }
  }
  return session.access_token ?? null;
};

api.interceptors.request.use(async config => {
  const token = await getAccessToken();
  if (token) {
    const headers = config.headers ?? {};
    (headers as any).Authorization = `Bearer ${token}`;
    config.headers = headers as any;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const err = error as AxiosError;
    const originalRequest = err.config as AxiosRequestConfig & {_retry?: boolean};

    const shouldRetry =
      !!err.response && err.response.status === 401 && !originalRequest._retry;

    if (shouldRetry) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        if (token) {
          const headers = originalRequest.headers ?? {};
          (headers as any).Authorization = `Bearer ${token}`;
          originalRequest.headers = headers as any;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('Refresh token failed', refreshErr);
      }
    }

    // Global error handling: rethrow to callers after logging.
    console.error('API request failed', err.message);
    return Promise.reject(err);
  },
);

export default api;
