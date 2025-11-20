import React, {useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import RootNavigator from './src/navigation/RootNavigator';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {ThemeProvider, useTheme} from './src/theme/ThemeProvider';

const AppNavigation = () => {
  const {colors, isDark} = useTheme();
  const {isAuthenticated} = useAuth();

  const navigationTheme = useMemo(
    () => ({
      dark: isDark,
      colors: {
        primary: colors.accentPrimary,
        background: colors.bgPrimary,
        card: colors.bgSurface,
        text: colors.textPrimary,
        border: colors.borderSubtle,
        notification: colors.accentPrimary,
      },
    }),
    [colors, isDark],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bgPrimary}
      />
      {isAuthenticated ? <RootNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
};

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
