import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

import {darkTheme, lightTheme, Theme} from './theme';

type ThemeContextType = {
  theme: Theme;
  mode: 'light' | 'dark';
  toggle: () => void;
  setMode: (mode: 'light' | 'dark') => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  mode: 'light',
  toggle: () => {},
  setMode: () => {},
});

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider = ({children}: ThemeProviderProps) => {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('nearid_theme_mode');
    if (stored === 'light' || stored === 'dark') return stored;
    return prefersDark ? 'dark' : 'light';
  });
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const applyTheme = (nextTheme: Theme) => {
    const {colors} = nextTheme;
    const root = document.documentElement;
    root.style.setProperty('--color-page-bg', colors.pageBg);
    root.style.setProperty('--color-bg-tint', colors.bgTint);
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
  };

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('nearid_theme_mode', mode);
    }
  }, [theme, mode]);

  const toggle = useCallback(() => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setThemeMode = useCallback((next: 'light' | 'dark') => {
    setMode(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mode,
      toggle,
      setMode: setThemeMode,
    }),
    [theme, mode, toggle, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
