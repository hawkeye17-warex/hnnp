import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {BodyText} from './text';
import {useTheme} from '../theme/ThemeProvider';

type LoadingStateProps = {
  message?: string;
};

const LoadingState = ({message = 'Loading…'}: LoadingStateProps) => {
  const {colors} = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accentPrimary} />
      <BodyText style={styles.text}>{message}</BodyText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  text: {
    textAlign: 'center',
  },
});

export default LoadingState;
