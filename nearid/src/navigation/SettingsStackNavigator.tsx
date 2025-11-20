import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import DiagnosticsScreen from '../screens/DiagnosticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {useTheme} from '../theme/ThemeProvider';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Diagnostics: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.bgSurface},
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {color: colors.textPrimary},
        contentStyle: {backgroundColor: colors.bgPrimary},
      }}>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
      <Stack.Screen
        name="Diagnostics"
        component={DiagnosticsScreen}
        options={{title: 'Diagnostics'}}
      />
    </Stack.Navigator>
  );
};

export default SettingsStackNavigator;
