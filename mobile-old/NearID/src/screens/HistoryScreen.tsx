import React from 'react';
import {StyleSheet, View} from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import {TitleText} from '../components/Text';

const HistoryScreen = (): React.JSX.Element => {
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <TitleText>History Screen</TitleText>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HistoryScreen;
