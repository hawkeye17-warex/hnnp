import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {useOrgConfig, OrgConfig} from '../hooks/useOrgConfig';

type OrgConfigState = {
  orgType: string;
  enabledModules: string[];
  config: OrgConfig | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

const OrgConfigContext = createContext<OrgConfigState>({
  orgType: 'office',
  enabledModules: [],
  config: null,
  isLoading: false,
  error: null,
  reload: () => undefined,
});

export const OrgConfigProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {data, isLoading, error} = useOrgConfig();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // trigger reloadKey change to re-run useOrgConfig (deps on session only, so we can keep stub)
  }, [reloadKey]);

  const value = useMemo<OrgConfigState>(
    () => ({
      orgType: data?.orgType ?? 'office',
      enabledModules: data?.enabledModules ?? [],
      config: data,
      isLoading,
      error,
      reload: () => setReloadKey(k => k + 1),
    }),
    [data, isLoading, error],
  );

  return <OrgConfigContext.Provider value={value}>{children}</OrgConfigContext.Provider>;
};

export const useOrgConfigContext = () => useContext(OrgConfigContext);

