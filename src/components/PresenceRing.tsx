import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';

import {useTheme} from '../theme/ThemeProvider';

type PresenceStatus = 'verified' | 'searching' | 'not_detected' | 'error';

type PresenceRingProps = {
  status: PresenceStatus;
};

const PresenceRing = ({status}: PresenceRingProps) => {
  const {colors} = useTheme();

  const baseColor = useMemo(() => {
    switch (status) {
      case 'verified':
        return colors.accentSuccess;
      case 'searching':
        return colors.accentPrimary;
      case 'error':
      case 'not_detected':
      default:
        return colors.danger;
    }
  }, [colors, status]);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runRing = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();

    runRing(ring1, 0);
    runRing(ring2, 450);

    return () => {
      ring1.stopAnimation();
      ring2.stopAnimation();
    };
  }, [ring1, ring2]);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.8],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0],
    }),
    backgroundColor: `${baseColor}22`,
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, ringStyle(ring1)]} />
      <Animated.View style={[styles.ring, ringStyle(ring2)]} />
      <View
        style={[
          styles.inner,
          {
            borderColor: baseColor,
            backgroundColor: `${baseColor}26`,
          },
        ]}
      />
    </View>
  );
};

const SIZE = 180;

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  inner: {
    width: SIZE * 0.65,
    height: SIZE * 0.65,
    borderRadius: (SIZE * 0.65) / 2,
    borderWidth: 3,
  },
});

export type {PresenceStatus};
export default PresenceRing;
