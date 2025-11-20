import React from 'react';
import { StyleSheet, View } from 'react-native';

import Card from '../components/Card';
import ScreenContainer from '../components/ScreenContainer';
import { BodyText, MutedText, TitleText } from '../components/text';

const SettingsScreen = () => {
  return (
    <ScreenContainer>
      <View style={styles.stack}>
        <Card>
          <TitleText style={styles.spaced}>Settings</TitleText>
          <BodyText style={styles.spaced}>
            Configure your NearID preferences here.
          </BodyText>
          <MutedText>More controls coming soon.</MutedText>
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
});

export default SettingsScreen;
