import {useCallback, useState} from 'react';

import type {Session} from '../types/session';

const STORAGE_KEY = 'nearid_admin_session';

const readSession = (): Session | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
};

export const useSession = () => {
  const [session, setSessionState] = useState<Session | null>(readSession);

  const setSession = useCallback((next: Session) => {
    setSessionState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {session, setSession, clearSession};
};
