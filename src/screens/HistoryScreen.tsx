import React from 'react';
import { StyleSheet, View } from 'react-native';

import Card from '../components/Card';
import ScreenContainer from '../components/ScreenContainer';
import { BodyText, MutedText, TitleText } from '../components/text';

const HistoryScreen = () => {
  return (
    <ScreenContainer>
      <View style={styles.stack}>
        <Card>
          <TitleText style={styles.spaced}>History</TitleText>
          <BodyText style={styles.spaced}>
            Recent check-ins will appear here.
          </BodyText>
          <MutedText>No history entries yet.</MutedText>
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

export default HistoryScreen;
