import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import PresenceRing, {PresenceStatus} from '../components/PresenceRing';
import ScreenContainer from '../components/ScreenContainer';
import StatusPill from '../components/StatusPill';
import {BodyText, MutedText, TitleText} from '../components/Text';
import {useTheme} from '../theme/ThemeProvider';

const PresenceScreen = (): React.JSX.Element => {
  const {colors} = useTheme();
  const status: PresenceStatus = 'verified';

  const todaySummary = [
    {label: 'Verified events', value: '3'},
    {label: 'Total verified time', value: '4h 12m'},
  ];

  const recentPlaces = [
    {name: 'Building A · Main Entrance', time: 'Verified at 3:12 PM', status: 'verified' as PresenceStatus},
    {name: 'Library · 2nd Floor', time: 'Verified at 1:05 PM', status: 'verified' as PresenceStatus},
    {name: 'Parking Garage', time: 'Verified at 9:24 AM', status: 'verified' as PresenceStatus},
  ];

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.logoMark,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.accentPrimary,
            },
          ]}
        />

        <View style={styles.headerCenter}>
          <TitleText style={styles.appTitle}>NearID</TitleText>
          <View style={styles.orgChip}>
            <BodyText style={[styles.orgChipText, {color: colors.accentPrimary}]}>
              U of M · Science
            </BodyText>
          </View>
        </View>

        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.accentPrimary,
            },
          ]}>
          <BodyText style={styles.avatarText}>NC</BodyText>
        </View>
      </View>

      <Card style={styles.presenceCard}>
        <StatusPill status={status} label="Verified" />

        <View style={styles.ringWrapper}>
          <PresenceRing status={status} />

          <View style={styles.presenceCopy}>
            <TitleText style={styles.presenceTitle}>You are verified</TitleText>
            <BodyText style={styles.place}>Building A · Main Entrance</BodyText>
            <MutedText style={styles.time}>Just now</MutedText>
          </View>
        </View>
      </Card>

      <View style={styles.actionRow}>
        <PrimaryButton title="Send Ping" onPress={() => {}} />
      </View>

      <Card style={styles.summaryCard}>
        <TitleText style={styles.sectionTitle}>Today</TitleText>
        {todaySummary.map(item => (
          <View style={styles.summaryRow} key={item.label}>
            <MutedText>{item.label}</MutedText>
            <BodyText style={styles.summaryValue}>{item.value}</BodyText>
          </View>
        ))}
      </Card>

      <Card style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <TitleText style={styles.sectionTitle}>Recent places</TitleText>
          <Pressable>
            <BodyText style={[styles.viewAll, {color: colors.accentPrimary}]}>View all</BodyText>
          </Pressable>
        </View>

        <View style={styles.recentList}>
          {recentPlaces.map(place => (
            <View style={styles.placeRow} key={place.name + place.time}>
              <View style={styles.placeCopy}>
                <BodyText style={styles.placeName}>{place.name}</BodyText>
                <MutedText style={styles.placeTime}>{place.time}</MutedText>
              </View>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      place.status === 'verified' ? colors.accentSuccess : colors.danger,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  page: {
    paddingBottom: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  orgChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E7EEFF',
  },
  orgChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F5F6FF',
    fontSize: 12,
    fontWeight: '700',
  },
  presenceCard: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  presenceCopy: {
    alignItems: 'center',
    gap: 4,
  },
  presenceTitle: {
    fontSize: 18,
  },
  place: {
    fontWeight: '500',
  },
  time: {
    fontSize: 14,
  },
  actionRow: {
    paddingHorizontal: 16,
  },
  summaryCard: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryValue: {
    fontWeight: '700',
  },
  recentCard: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAll: {
    fontWeight: '600',
  },
  recentList: {
    gap: 12,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  placeCopy: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontWeight: '600',
  },
  placeTime: {
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default PresenceScreen;
