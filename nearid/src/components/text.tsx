import React from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type ThemedTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
};

const TitleText = ({ style, children, ...rest }: ThemedTextProps) => {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.title, { color: colors.textPrimary }, style]}
      {...rest}>
      {children}
    </Text>
  );
};

const BodyText = ({ style, children, ...rest }: ThemedTextProps) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.body, { color: colors.textPrimary }, style]} {...rest}>
      {children}
    </Text>
  );
};

const MutedText = ({ style, children, ...rest }: ThemedTextProps) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.body, { color: colors.textMuted }, style]} {...rest}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export { BodyText, MutedText, TitleText };
