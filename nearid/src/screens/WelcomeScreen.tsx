import React from 'react';
import {StyleSheet, View} from 'react-native';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import {BodyText, TitleText} from '../components/text';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {OnboardingStackParamList} from '../navigation/OnboardingNavigator';
import {useTheme} from '../theme/ThemeProvider';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const {colors} = useTheme();

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Card style={styles.card}>
          <View
            style={[
              styles.logoOuter,
              {borderColor: colors.accentPrimary},
            ]}>
            <View
              style={[
                styles.logoInner,
                {backgroundColor: colors.accentPrimary},
              ]}
            />
          </View>
          <TitleText style={styles.title}>Welcome to NearID</TitleText>
          <BodyText style={styles.subtitle}>
            Seamless presence verification for your organization. Get started to join your org.
          </BodyText>
          <PrimaryButton
            title="Get Started"
            onPress={() => navigation.navigate('OrgEmail')}
            style={styles.button}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 16,
  },
  logoOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
});

export default WelcomeScreen;
