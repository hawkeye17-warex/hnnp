import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import OrgEmailScreen from '../screens/OrgEmailScreen';
import PermissionsScreen from '../screens/PermissionsScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import {useTheme} from '../theme/ThemeProvider';

export type OnboardingStackParamList = {
  Welcome: undefined;
  OrgEmail: undefined;
  Permissions: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator = () => {
  const {colors} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.bgSurface},
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {color: colors.textPrimary},
        contentStyle: {backgroundColor: colors.bgPrimary},
      }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{headerShown: false}} />
      <Stack.Screen name="OrgEmail" component={OrgEmailScreen} options={{title: 'Organization'}} />
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{title: 'Permissions'}}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
