import React, {useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import {BodyText, TitleText} from '../components/text';
import {useAuth} from '../context/AuthContext';
import {useTheme} from '../theme/ThemeProvider';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {OnboardingStackParamList} from '../navigation/OnboardingNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'OrgEmail'>;

const OrgEmailScreen = () => {
  const {colors} = useTheme();
  const {signIn} = useAuth();
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    const dummyOrg = {
      id: 'org-1',
      name: 'U of M',
      department: 'Science',
    };
    const dummyUser = {
      id: 'user-1',
      name: 'Nico Collins',
      email: email || 'nico.collins@example.com',
      orgId: dummyOrg.id,
    };
    signIn(dummyUser, dummyOrg);
    navigation.replace('Permissions');
  };

  return (
    <ScreenContainer>
      <View style={styles.stack}>
        <TitleText style={styles.title}>Join your organization</TitleText>
        <BodyText style={styles.subtitle}>
          Enter your work email to continue. We’ll confirm your org and set up presence.
        </BodyText>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.borderSubtle,
              backgroundColor: colors.bgSurface,
              color: colors.textPrimary,
            },
          ]}
          placeholder="name@organization.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <PrimaryButton title="Continue" onPress={handleContinue} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 16,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});

export default OrgEmailScreen;
