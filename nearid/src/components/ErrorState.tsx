import React from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {BodyText} from './text';
import {useTheme} from '../theme/ThemeProvider';

type ErrorStateProps = {
  message: string;
};

const ErrorState = ({message}: ErrorStateProps) => {
  const {colors} = useTheme();
  return (
    <View style={[styles.container, {backgroundColor: `${colors.danger}15`, borderColor: colors.danger}]}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <BodyText style={styles.text}>{message}</BodyText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
});

export default ErrorState;
