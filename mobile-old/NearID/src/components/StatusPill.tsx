import React, {useMemo} from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

import {PresenceStatus} from './PresenceRing';
import {useTheme} from '../theme/ThemeProvider';

type StatusPillProps = {
  status: PresenceStatus;
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const StatusPill = ({status, label, style, textStyle}: StatusPillProps): React.JSX.Element => {
  const {colors} = useTheme();

  const {backgroundColor, textColor} = useMemo(() => {
    switch (status) {
      case 'verified':
        return {
          backgroundColor: '#E8F8F1',
          textColor: colors.accentSuccess,
        };
      case 'searching':
        return {
          backgroundColor: '#E7EEFF',
          textColor: colors.accentPrimary,
        };
      case 'not_detected':
      case 'error':
      default:
        return {
          backgroundColor: '#FFE9EC',
          textColor: colors.danger,
        };
    }
  }, [colors.accentPrimary, colors.accentSuccess, colors.danger, status]);

  return (
    <View style={[styles.pill, {backgroundColor}, style]}>
      <Text style={[styles.label, {color: textColor}, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusPill;
