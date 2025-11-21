import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Navigate} from 'react-router-dom';

import type {Session} from '../types/session';

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
});

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
  const initial = readStoredAuth();
  const [session, setSession] = useState<Session | null>(initial.session);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initial.currentUser);

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
    }),
    [session, currentUser, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => useContext(AuthContext);

export const requireAuth =
  <P extends object>(Component: React.ComponentType<P>): React.FC<P> =>
  props => {
    const {session} = useAuth();
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return <Component {...(props as P)} />;
  };
