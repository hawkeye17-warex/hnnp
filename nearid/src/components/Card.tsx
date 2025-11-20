import React from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type CardProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

const Card = ({ style, children, ...rest }: CardProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default Card;
