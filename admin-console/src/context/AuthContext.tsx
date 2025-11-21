import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {Navigate} from 'react-router-dom';

import type {Session} from '../types/session';
import {supabase} from '../api/api';

export type CurrentUser = {
  id?: string;
  email?: string;
  name?: string;
  orgId?: string;
};

type AuthState = {
  session: Session | null;
  currentUser: CurrentUser | null;
  login: (session: Session, user?: CurrentUser) => void;
  logout: () => void;
  hydrated: boolean;
};

const STORAGE_KEY = 'nearid_admin_session';

const readStoredAuth = (): {session: Session | null; currentUser: CurrentUser | null} => {
  if (typeof window === 'undefined') return {session: null, currentUser: null};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {session: null, currentUser: null};
  try {
    const parsed = JSON.parse(raw);
    return {
      session: parsed?.session ?? null,
      currentUser: parsed?.currentUser ?? null,
    };
  } catch {
    return {session: null, currentUser: null};
  }
};

const AuthContext = createContext<AuthState>({
  session: null,
  currentUser: null,
  login: () => {},
  logout: () => {},
  hydrated: false,
});

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
  const initial = readStoredAuth();
  const [session, setSession] = useState<Session | null>(initial.session);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initial.currentUser);
  const [hydrated, setHydrated] = useState(typeof window !== 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = readStoredAuth();
    setSession(stored.session);
    setCurrentUser(stored.currentUser);
    setHydrated(true);
  }, []);

  const persist = useCallback((nextSession: Session | null, nextUser: CurrentUser | null) => {
    if (typeof window === 'undefined') return;
    if (!nextSession && !nextUser) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({session: nextSession, currentUser: nextUser}),
    );
  }, []);

  const restoreSupabaseSession = useCallback(async () => {
    if (session) return;
    try {
      const {data, error} = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        const profile: CurrentUser = {
          id: data.session.user?.id,
          email: data.session.user?.email ?? undefined,
        };
        const restoredSession: Session = {
          orgId: data.session.user?.id ?? '',
          apiKey: data.session.access_token,
        };
        setSession(restoredSession);
        setCurrentUser(profile);
        persist(restoredSession, profile);
      }
    } catch (err) {
      console.warn('Supabase session restore failed', err);
    }
  }, [session, persist]);

  useEffect(() => {
    restoreSupabaseSession();
  }, [restoreSupabaseSession]);

  const login = useCallback(
    (nextSession: Session, user?: CurrentUser) => {
      const resolvedUser = user ?? {orgId: nextSession.orgId};
      setSession(nextSession);
      setCurrentUser(resolvedUser);
      persist(nextSession, resolvedUser);
    },
    [persist],
  );

  const logout = useCallback(() => {
    setSession(null);
    setCurrentUser(null);
    persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({
      session,
      currentUser,
      login,
      logout,
      hydrated,
    }),
    [session, currentUser, login, logout, hydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => useContext(AuthContext);

export const requireAuth =
  <P extends object>(Component: React.ComponentType<P>): React.FC<P> =>
  props => {
    const {session, hydrated} = useAuth();
    if (!hydrated) {
      return <div>Loading...</div>;
    }
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return <Component {...(props as P)} />;
  };

export const ProtectedRoute = requireAuth;
