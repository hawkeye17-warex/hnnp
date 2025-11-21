import {useCallback} from 'react';

import type {Session} from '../types/session';
import {useAuth} from '../context/AuthContext';

export const useSession = () => {
  const {session, login, logout} = useAuth();

  const setSession = useCallback(
    (next: Session) => {
      login(next);
    },
    [login],
  );

  const clearSession = useCallback(() => {
    logout();
  }, [logout]);

  return {session, setSession, clearSession};
};
