import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {enableScreens} from 'react-native-screens';

import HistoryScreen from '../screens/HistoryScreen';
import PresenceScreen from '../screens/PresenceScreen';
import SettingsScreen from '../screens/SettingsScreen';

enableScreens();

export type RootTabParamList = {
  Presence: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const RootNavigator = (): React.JSX.Element => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Presence" component={PresenceScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default RootNavigator;
