import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

type ScreenContainerProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

const ScreenContainer = ({
  children,
  scroll = false,
  contentContainerStyle,
  style,
}: ScreenContainerProps) => {
  const { colors } = useTheme();

  if (scroll) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.bgPrimary }]}
          contentContainerStyle={[styles.content, contentContainerStyle]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
});

export default ScreenContainer;
