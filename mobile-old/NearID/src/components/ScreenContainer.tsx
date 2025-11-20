import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '../theme/ThemeProvider';

type ScreenContainerProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const ScreenContainer = ({
  children,
  scroll = false,
  style,
  contentContainerStyle,
}: ScreenContainerProps): React.JSX.Element => {
  const {colors} = useTheme();

  const backgroundStyle = {backgroundColor: colors.bgPrimary};

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, backgroundStyle]}>
        <ScrollView
          style={[styles.container, backgroundStyle, style]}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, backgroundStyle]}>
      <View style={[styles.container, backgroundStyle, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default ScreenContainer;
