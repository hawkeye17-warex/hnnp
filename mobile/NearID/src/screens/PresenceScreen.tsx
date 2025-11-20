import React from 'react';
import {StyleSheet, View} from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import {BodyText, TitleText} from '../components/Text';
import {useTheme} from '../theme/ThemeProvider';

const PresenceScreen = (): React.JSX.Element => {
  const {colors} = useTheme();

  return (
    <ScreenContainer>
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
            <BodyText
              style={[styles.orgChipText, {color: colors.accentPrimary}]}>
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

      <View style={styles.content}>
        <TitleText>Presence Screen</TitleText>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});

export default PresenceScreen;
