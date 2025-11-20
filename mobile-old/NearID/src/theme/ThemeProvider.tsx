import React, {createContext, useContext, useMemo} from 'react';
import {ColorSchemeName, useColorScheme} from 'react-native';

import {darkTheme, lightTheme, ThemeColors} from './colors';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  scheme: ColorSchemeName;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightTheme,
  isDark: false,
  scheme: 'light',
});

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider = ({children}: ThemeProviderProps): React.JSX.Element => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const value = useMemo(
    () => ({
      colors,
      isDark,
      scheme,
    }),
    [colors, isDark, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
