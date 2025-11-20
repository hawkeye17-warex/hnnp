import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Card from '../components/Card';
import ScreenContainer from '../components/ScreenContainer';
import {BodyText, TitleText} from '../components/text';
import useDeviceStatus from '../hooks/useDeviceStatus';
import usePresenceBroadcast from '../hooks/usePresenceBroadcast';
import {useTheme} from '../theme/ThemeProvider';
import LoadingState from '../components/LoadingState';

type Check = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

const DiagnosticsScreen = () => {
  const {colors} = useTheme();
  const {
    bluetoothEnabled,
    nearbyPermission,
    notificationsEnabled,
    batterySaverEnabled,
    loading: statusLoading,
  } = useDeviceStatus();
  const {broadcasting, loading: broadcastLoading, lastError} = usePresenceBroadcast();

  const checks: Check[] = useMemo(
    () => [
      {
        id: 'bluetooth',
        label: 'Bluetooth enabled',
        ok: bluetoothEnabled,
      },
      {
        id: 'nearby',
        label: 'Nearby devices permission',
        ok: nearbyPermission === 'granted',
        detail: nearbyPermission,
      },
      {
        id: 'notifications',
        label: 'Notifications allowed',
        ok: notificationsEnabled,
      },
      {
        id: 'battery',
        label: 'Battery saver off',
        ok: !batterySaverEnabled,
        detail: batterySaverEnabled ? 'On' : 'Off',
      },
      {
        id: 'broadcasting',
        label: 'Presence broadcast active',
        ok: broadcasting && !lastError,
        detail: lastError ?? (broadcasting ? 'Running' : 'Starting'),
      },
    ],
    [
      batterySaverEnabled,
      bluetoothEnabled,
      broadcasting,
      lastError,
      nearbyPermission,
      notificationsEnabled,
    ],
  );

  const renderIcon = (ok: boolean) => (
    <Ionicons
      name={ok ? 'checkmark-circle' : 'close-circle'}
      size={22}
      color={ok ? colors.accentSuccess : colors.danger}
    />
  );

  return (
    <ScreenContainer>
      <View style={styles.stack}>
        <Card>
          <TitleText style={styles.title}>Diagnostics</TitleText>
          <BodyText style={styles.subtitle}>
            Quick checks to confirm your device is ready for presence broadcasting.
          </BodyText>
        </Card>

        <Card>
          {statusLoading || broadcastLoading ? (
            <LoadingState message="Running diagnostics..." />
          ) : (
            checks.map((check, idx) => (
              <View
                key={check.id}
                style={[
                  styles.row,
                  idx === checks.length - 1 && styles.rowLast,
                ]}>
                <View style={styles.rowText}>
                  <TitleText style={styles.label}>{check.label}</TitleText>
                  {check.detail ? (
                    <BodyText style={styles.detail}>{check.detail}</BodyText>
                  ) : null}
                </View>
                {renderIcon(check.ok)}
              </View>
            ))
          )}
        </Card>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 16,
    paddingTop: 8,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
  },
  detail: {
    marginTop: 2,
  },
});

export default DiagnosticsScreen;
