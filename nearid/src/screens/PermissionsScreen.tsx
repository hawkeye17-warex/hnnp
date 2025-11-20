import React from 'react';
import {StyleSheet, View} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import {BodyText, TitleText} from '../components/text';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {OnboardingStackParamList} from '../navigation/OnboardingNavigator';
import {useTheme} from '../theme/ThemeProvider';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Permissions'>;

const PermissionsScreen = () => {
  const navigation = useNavigation<Nav>();
  const {colors} = useTheme();

  return (
    <ScreenContainer>
      <View style={styles.stack}>
        <TitleText style={styles.title}>Enable permissions</TitleText>
          <BodyText style={styles.subtitle}>
            NearID needs Bluetooth and notifications to verify your presence and keep you aware of
            important activity. You can change this later in system settings.
          </BodyText>
        <View
          style={[
            styles.cardish,
            {borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface},
          ]}>
          <BodyText style={styles.itemTitle}>Bluetooth</BodyText>
          <BodyText style={styles.itemSubtitle}>Required to broadcast and detect presence.</BodyText>
          <BodyText style={[styles.itemTitle, styles.spaceTop]}>Notifications</BodyText>
          <BodyText style={styles.itemSubtitle}>
            Get alerts for sign-ins and security messages.
          </BodyText>
        </View>
        <PrimaryButton
          title="Allow and continue"
          onPress={() => navigation.reset({index: 0, routes: [{name: 'Welcome'}]})}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    lineHeight: 22,
  },
  cardish: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  itemTitle: {
    fontWeight: '700',
  },
  itemSubtitle: {
    lineHeight: 20,
  },
  spaceTop: {
    marginTop: 8,
  },
});

export default PermissionsScreen;
