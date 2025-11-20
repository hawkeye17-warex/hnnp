import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import Card from '../components/Card';
import PresenceRing from '../components/PresenceRing';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import { BodyText, MutedText, TitleText } from '../components/text';
import { useTheme } from '../theme/ThemeProvider';

const PresenceScreen = () => {
  const { isDark, colors } = useTheme();

  return (
    <ScreenContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.stack}>
        <Card>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.logoOuter,
                { borderColor: colors.accentPrimary },
              ]}>
              <View
                style={[
                  styles.logoInner,
                  { backgroundColor: colors.accentPrimary },
                ]}
              />
            </View>
            <View style={styles.headerCenter}>
              <TitleText>NearID</TitleText>
              <View
                style={[
                  styles.orgPill,
                  { backgroundColor: `${colors.accentPrimary}1A` },
                ]}>
                <BodyText
                  style={[styles.orgText, { color: colors.accentPrimary }]}>
                  U of M · Science
                </BodyText>
              </View>
            </View>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.accentPrimary },
              ]}>
              <TitleText style={styles.avatarText}>NC</TitleText>
            </View>
          </View>
          <TitleText style={styles.spaced}>Presence</TitleText>
          <BodyText style={styles.spaced}>
            Theme placeholder screen. Replace this with the real experience.
          </BodyText>
          <MutedText style={styles.spaced}>
            This button is wired to the theme colors but disabled for now.
          </MutedText>
          <View style={styles.ringWrapper}>
            <PresenceRing status="searching" />
          </View>
          <PrimaryButton
            title="Check in"
            onPress={() => {}}
            disabled
            style={styles.button}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  logoInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  orgPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  orgText: {
    fontSize: 13,
    fontWeight: '600',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F5F6FF',
    fontSize: 14,
    fontWeight: '700',
  },
  spaced: {
    marginBottom: 8,
  },
  ringWrapper: {
    marginVertical: 16,
    alignItems: 'center',
  },
  button: {
    marginTop: 12,
  },
});

export default PresenceScreen;
