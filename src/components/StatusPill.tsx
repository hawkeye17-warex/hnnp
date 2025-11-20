import React, {useMemo} from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

type PillStatus = 'verified' | 'searching' | 'error';

type StatusPillProps = {
  status: PillStatus;
  label: string;
  textStyle?: StyleProp<TextStyle>;
};

const StatusPill = ({status, label, textStyle}: StatusPillProps) => {
  const {colors} = useTheme();

  const {background, textColor} = useMemo(() => {
    switch (status) {
      case 'verified':
        return {background: `${colors.accentSuccess}1A`, textColor: colors.accentSuccess};
      case 'searching':
        return {background: `${colors.accentPrimary}1A`, textColor: colors.accentPrimary};
      case 'error':
      default:
        return {background: `${colors.danger}1A`, textColor: colors.danger};
    }
  }, [colors, status]);

  return (
    <View style={[styles.pill, {backgroundColor: background}]}>
      <Text style={[styles.text, {color: textColor}, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export type {PillStatus};
export default StatusPill;
