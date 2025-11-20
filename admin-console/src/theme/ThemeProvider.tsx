import React, {createContext, useContext, useEffect, useMemo} from 'react';

import {lightTheme, Theme} from './theme';

type ThemeContextType = {
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
});

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider = ({children}: ThemeProviderProps) => {
  const value = useMemo(() => ({theme: lightTheme}), []);

  useEffect(() => {
    const {colors} = lightTheme;
    const root = document.documentElement;
    root.style.setProperty('--color-page-bg', colors.pageBg);
    root.style.setProperty('--color-card-bg', colors.cardBg);
    root.style.setProperty('--color-card-border', colors.cardBorder);
    root.style.setProperty('--color-text-primary', colors.textPrimary);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-accent-primary', colors.accentPrimary);
    root.style.setProperty('--color-accent-success', colors.accentSuccess);
    root.style.setProperty('--color-danger', colors.danger);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-sidebar-bg', colors.sidebarBg);
    root.style.setProperty('--color-sidebar-text', colors.sidebarText);
    root.style.setProperty('--color-sidebar-active', colors.sidebarActive);
  }, []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
