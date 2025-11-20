import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

type PresenceStatus = 'verified' | 'searching' | 'not_detected' | 'error';

type PresenceRingProps = {
  status: PresenceStatus;
};

const PresenceRing = ({status}: PresenceRingProps): React.JSX.Element => {
  const {colors} = useTheme();
  const outerScale = useRef(new Animated.Value(1)).current;
  const outerOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(outerScale, {
            toValue: 1.25,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(outerScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(outerOpacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(outerOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [outerOpacity, outerScale]);

  const accentColor = useMemo(() => {
    if (status === 'verified') {
      return colors.accentSuccess;
    }
    if (status === 'searching') {
      return colors.accentPrimary;
    }
    return colors.danger;
  }, [colors.accentPrimary, colors.accentSuccess, colors.danger, status]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ringOuter,
          {
            borderColor: accentColor,
            transform: [{scale: outerScale}],
            opacity: outerOpacity,
          },
        ]}
      />

      <View
        style={[
          styles.ringInner,
          {
            borderColor: accentColor,
          },
        ]}
      />

      <View
        style={[
          styles.core,
          {
            borderColor: accentColor,
          },
        ]}
      />
    </View>
  );
};

const BASE_SIZE = 180;

const styles = StyleSheet.create({
  container: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    borderWidth: 2,
  },
  ringInner: {
    position: 'absolute',
    width: BASE_SIZE - 16,
    height: BASE_SIZE - 16,
    borderRadius: (BASE_SIZE - 16) / 2,
    borderWidth: 2,
    opacity: 0.6,
  },
  core: {
    width: BASE_SIZE - 48,
    height: BASE_SIZE - 48,
    borderRadius: (BASE_SIZE - 48) / 2,
    borderWidth: 4,
  },
});

export default PresenceRing;
