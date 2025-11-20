import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HistoryScreen from '../screens/HistoryScreen';
import PresenceScreen from '../screens/PresenceScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';

export type RootTabParamList = {
  Presence: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const RootNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.bgSurface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderSubtle,
        },
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={getIconName(route.name as keyof RootTabParamList, focused)}
            size={size}
            color={color}
          />
        ),
      })}>
      <Tab.Screen
        name="Presence"
        component={PresenceScreen}
        options={{ title: 'Presence' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

const getIconName = (routeName: keyof RootTabParamList, focused: boolean) => {
  switch (routeName) {
    case 'Presence':
      return focused ? 'pulse' : 'pulse-outline';
    case 'History':
      return focused ? 'time' : 'time-outline';
    case 'Settings':
      return focused ? 'settings' : 'settings-outline';
    default:
      return 'ellipse';
  }
};

export default RootNavigator;
