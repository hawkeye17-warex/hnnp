import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import { BodyText, MutedText, TitleText } from '../components/text';
import { useTheme } from '../theme/ThemeProvider';

const PresenceScreen = () => {
  const { isDark } = useTheme();

  return (
    <ScreenContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.stack}>
        <Card>
          <TitleText style={styles.spaced}>Presence</TitleText>
          <BodyText style={styles.spaced}>
            Theme placeholder screen. Replace this with the real experience.
          </BodyText>
          <MutedText style={styles.spaced}>
            This button is wired to the theme colors but disabled for now.
          </MutedText>
          <PrimaryButton
            title="Check in"
            onPress={() => {}}
            disabled
            style={styles.button}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    justifyContent: 'center',
  },
  spaced: {
    marginBottom: 8,
  },
  button: {
    marginTop: 12,
  },
});

export default PresenceScreen;
