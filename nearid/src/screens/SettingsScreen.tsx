import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { BodyText, MutedText, TitleText } from '../components/text';
import { useTheme } from '../theme/ThemeProvider';
import useDeviceStatus from '../hooks/useDeviceStatus';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/SettingsStackNavigator';
import { clearDeviceSecret } from '../storage/deviceSecret';
import { deleteAccount, exportHistory } from '../api/client';

const SettingsScreen = () => {
  const { colors } = useTheme();
  const [presenceAlerts, setPresenceAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(false);
  const {
    bluetoothEnabled,
    nearbyPermission,
    notificationsEnabled,
    batterySaverEnabled,
    loading: statusLoading,
  } = useDeviceStatus();
  const { signOut } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const versionLabel = useMemo(() => 'v0.1.0 (mock)', []);

  const statusChip = (
    label: string,
    tone: 'ok' | 'warn' | 'danger',
  ) => (
    <View style={styles.statusWrap}>
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor:
              tone === 'ok'
                ? colors.accentSuccess
                : tone === 'warn'
                ? colors.warning
                : colors.danger,
          },
        ]}
      />
      <MutedText>{label}</MutedText>
    </View>
  );

  return (
    <ScreenContainer scroll>
      <View style={styles.stack}>
        <SettingsSection title="Account" description="Manage your identity">
          <SettingsRow label="Name" value="Nico Collins" />
          <SettingsRow label="Email" value="nico.collins@example.com" />
          <SettingsRow label="Organization" value="U of M · Science" style={styles.lastRow} />
          <PrimaryButton title="Sign out" onPress={signOut} style={styles.button} />
        </SettingsSection>

        <SettingsSection title="Notifications" description="Control alerts from NearID">
          <SettingsRow
            label="Presence alerts"
            rightContent={
              <Switch
                value={presenceAlerts}
                onValueChange={setPresenceAlerts}
                trackColor={{ false: colors.borderSubtle, true: colors.accentPrimary }}
                thumbColor={colors.bgSurface}
              />
            }
          />
          <SettingsRow
            label="Security alerts"
            rightContent={
              <Switch
                value={securityAlerts}
                onValueChange={setSecurityAlerts}
                trackColor={{ false: colors.borderSubtle, true: colors.accentPrimary }}
                thumbColor={colors.bgSurface}
              />
            }
            style={styles.lastRow}
          />
        </SettingsSection>

        <SettingsSection title="Device Status">
          {statusLoading ? (
            <MutedText>Checking…</MutedText>
          ) : (
            <>
              <SettingsRow
                label="Bluetooth"
                rightContent={statusChip(
                  bluetoothEnabled ? 'On' : 'Off',
                  bluetoothEnabled ? 'ok' : 'danger',
                )}
              />
              <SettingsRow
                label="Nearby devices"
                rightContent={statusChip(
                  nearbyPermission === 'granted' ? 'Allowed' : 'Denied',
                  nearbyPermission === 'granted' ? 'ok' : 'danger',
                )}
              />
              <SettingsRow
                label="Notifications"
                rightContent={statusChip(
                  notificationsEnabled ? 'Allowed' : 'Blocked',
                  notificationsEnabled ? 'ok' : 'danger',
                )}
              />
              <SettingsRow
                label="Battery saver"
                rightContent={statusChip(
                  batterySaverEnabled ? 'On' : 'Off',
                  batterySaverEnabled ? 'warn' : 'ok',
                )}
                style={styles.lastRow}
              />
            </>
          )}
        </SettingsSection>

        <SettingsSection
          title="Privacy"
          description="Control what data you keep or remove.">
          <BodyText>
            Download or delete your presence history at any time. Actions are immediate.
          </BodyText>
          <PrimaryButton
            title="Download my history"
            onPress={async () => {
              try {
                await exportHistory();
                Alert.alert('Export ready', 'Your history export has been prepared.');
              } catch (err) {
                Alert.alert('Export failed', 'Could not export history right now.');
              }
            }}
            style={styles.button}
          />
          <PrimaryButton
            title="Delete my account"
            onPress={() => {
              Alert.alert(
                'Delete account',
                'This will remove your account info from this device. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteAccount();
                        await clearDeviceSecret();
                        signOut();
                      } catch (err) {
                        Alert.alert('Deletion failed', 'Could not delete account right now.');
                      }
                    },
                  },
                ],
              );
            }}
            style={[styles.button, { backgroundColor: colors.danger }]}
          />
        </SettingsSection>

        <SettingsSection title="Help & About">
          <SettingsRow label="FAQ" onPress={() => {}} />
          <SettingsRow
            label="Run diagnostics"
            onPress={() => navigation.navigate('Diagnostics')}
          />
          <SettingsRow
            label="App version"
            value={versionLabel}
            style={styles.lastRow}
          />
        </SettingsSection>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 16,
  },
  button: {
    marginTop: 4,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default SettingsScreen;
