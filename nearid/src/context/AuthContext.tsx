import React, {createContext, useContext, useMemo, useState} from 'react';

import {Org, User} from '../types/auth';

type AuthContextValue = {
  user: User | null;
  org: Org | null;
  isAuthenticated: boolean;
  signIn: (user: User, org: Org) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  org: null,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
});

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({children}: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);

  const signIn = (nextUser: User, nextOrg: Org) => {
    setUser(nextUser);
    setOrg(nextOrg);
  };

  const signOut = () => {
    setUser(null);
    setOrg(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      org,
      isAuthenticated: Boolean(user && org),
      signIn,
      signOut,
    }),
    [user, org],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => useContext(AuthContext);
