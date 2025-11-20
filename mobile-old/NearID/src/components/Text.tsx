import React from 'react';
import {StyleProp, StyleSheet, Text, TextProps, TextStyle} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

type ThemedTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
};

export const TitleText = ({style, children, ...rest}: ThemedTextProps) => {
  const {colors} = useTheme();
  return (
    <Text
      {...rest}
      style={[styles.title, {color: colors.textPrimary}, style]}>
      {children}
    </Text>
  );
};

export const BodyText = ({style, children, ...rest}: ThemedTextProps) => {
  const {colors} = useTheme();
  return (
    <Text
      {...rest}
      style={[styles.body, {color: colors.textPrimary}, style]}>
      {children}
    </Text>
  );
};

export const MutedText = ({style, children, ...rest}: ThemedTextProps) => {
  const {colors} = useTheme();
  return (
    <Text
      {...rest}
      style={[styles.muted, {color: colors.textMuted}, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  muted: {
    fontSize: 14,
    fontWeight: '400',
  },
});

export default BodyText;
