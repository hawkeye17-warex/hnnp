import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';
import {BodyText, MutedText} from './text';

type SettingsRowProps = {
  label: string;
  value?: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const SettingsRow = ({
  label,
  value,
  subtitle,
  rightContent,
  onPress,
  style,
}: SettingsRowProps) => {
  const {colors} = useTheme();
  const Component = onPress ? Pressable : View;

  return (
    <Component
      style={[
        styles.container,
        {borderColor: colors.borderSubtle},
        style,
      ]}
      {...(onPress ? {android_ripple: {color: colors.borderSubtle}, onPress} : {})}>
      <View style={styles.textCol}>
        <BodyText style={styles.label}>{label}</BodyText>
        {subtitle ? <MutedText>{subtitle}</MutedText> : null}
      </View>
      {rightContent ? (
        rightContent
      ) : value ? (
        <MutedText>{value}</MutedText>
      ) : null}
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  textCol: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  label: {
    fontWeight: '600',
  },
});

export default SettingsRow;
