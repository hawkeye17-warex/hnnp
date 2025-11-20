import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import Card from '../components/Card';
import PresenceRing from '../components/PresenceRing';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import StatusPill from '../components/StatusPill';
import { BodyText, MutedText, TitleText } from '../components/text';
import { useTheme } from '../theme/ThemeProvider';

const RECENT_PLACES = [
  { name: 'Building A · Lab 3', time: 'Verified at 09:42', status: 'verified' },
  { name: 'Building B · Lobby', time: 'Verified at 08:15', status: 'verified' },
  { name: 'Annex · Server Room', time: 'Verified at 07:30', status: 'error' },
];

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
          <StatusPill status="verified" label="Verified" />
          <View style={styles.ringWrapper}>
            <PresenceRing status="verified" />
          </View>
          <View style={styles.centerText}>
            <TitleText style={styles.spaced}>You are verified</TitleText>
            <BodyText style={styles.spaced}>
              Building A · Main entrance · Just now
            </BodyText>
            <MutedText>
              Mock data for now. Hook this up to presence once available.
            </MutedText>
          </View>
        </Card>
        <Card>
          <TitleText style={styles.spaced}>Today</TitleText>
          <View style={styles.row}>
            <BodyText>Verified events</BodyText>
            <TitleText>3</TitleText>
          </View>
          <View style={styles.row}>
            <BodyText>Total verified time</BodyText>
            <TitleText>4h 12m</TitleText>
          </View>
        </Card>
        <Card>
          <View style={styles.listHeader}>
            <TitleText>Recent places</TitleText>
            <BodyText style={[styles.viewAll, { color: colors.accentPrimary }]}>
              View all
            </BodyText>
          </View>
          <View style={styles.list}>
            {RECENT_PLACES.map(place => (
              <View key={place.name} style={styles.listItem}>
                <View style={styles.listText}>
                  <TitleText style={styles.listTitle}>{place.name}</TitleText>
                  <MutedText>{place.time}</MutedText>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        place.status === 'verified'
                          ? colors.accentSuccess
                          : colors.danger,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        </Card>
        <PrimaryButton
          title="Send Ping"
          onPress={() => {}}
          style={styles.button}
        />
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
  centerText: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAll: {
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listText: {
    flex: 1,
    marginRight: 12,
  },
  listTitle: {
    marginBottom: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  button: {
    marginTop: 16,
  },
});

export default PresenceScreen;
