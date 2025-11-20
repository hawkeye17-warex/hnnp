import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const PrimaryButton = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
}: PrimaryButtonProps): React.JSX.Element => {
  const {colors} = useTheme();

  const backgroundColor = disabled ? colors.borderSubtle : colors.accentPrimary;
  const labelColor = disabled ? colors.textMuted : '#F5F6FF';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {backgroundColor},
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}>
      <Text style={[styles.text, {color: labelColor}, textStyle]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrimaryButton;
