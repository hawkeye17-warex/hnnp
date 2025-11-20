import React from 'react';
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type PrimaryButtonProps = {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PrimaryButton = ({
  title,
  onPress,
  disabled = false,
  style,
}: PrimaryButtonProps) => {
  const { colors } = useTheme();

  const backgroundColor = disabled ? colors.borderSubtle : colors.accentPrimary;
  const textColor = disabled ? colors.textMuted : colors.textPrimary;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor }, style]}>
      <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PrimaryButton;
