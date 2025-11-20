import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const Card = ({children, style}: CardProps): React.JSX.Element => {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
});

export default Card;
