import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

const PresenceScreen = () => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}
      edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
        ]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Presence
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Theme placeholder screen. Replace this with the real experience.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default PresenceScreen;
