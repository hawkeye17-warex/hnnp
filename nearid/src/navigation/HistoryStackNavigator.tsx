import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import HistoryDetailScreen from '../screens/HistoryDetailScreen';
import HistoryScreen from '../screens/HistoryScreen';
import {useTheme} from '../theme/ThemeProvider';
import {HistoryEvent} from '../types/history';

export type HistoryStackParamList = {
  HistoryList: undefined;
  HistoryDetail: {event: HistoryEvent};
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

const HistoryStackNavigator = () => {
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
        name="HistoryList"
        component={HistoryScreen}
        options={{title: 'History'}}
      />
      <Stack.Screen
        name="HistoryDetail"
        component={HistoryDetailScreen}
        options={{title: 'Details'}}
      />
    </Stack.Navigator>
  );
};

export default HistoryStackNavigator;
