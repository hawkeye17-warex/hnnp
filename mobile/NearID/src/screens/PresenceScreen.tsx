import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';

const PresenceScreen = (): React.JSX.Element => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgPrimary,
        },
        text: {
          fontSize: 18,
          fontWeight: '600',
          color: colors.textPrimary,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Presence Screen</Text>
    </View>
  );
};

export default PresenceScreen;
