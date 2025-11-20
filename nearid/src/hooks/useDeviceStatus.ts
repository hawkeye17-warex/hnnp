import {useCallback, useEffect, useState} from 'react';
import {Platform} from 'react-native';

export type DeviceStatus = {
  bluetoothEnabled: boolean;
  nearbyPermission: 'granted' | 'denied';
  notificationsEnabled: boolean;
  batterySaverEnabled: boolean;
  loading: boolean;
  refresh: () => void;
};

const useDeviceStatus = (): DeviceStatus => {
  const [state, setState] = useState<DeviceStatus>({
    bluetoothEnabled: true,
    nearbyPermission: 'granted',
    notificationsEnabled: true,
    batterySaverEnabled: false,
    loading: true,
    refresh: () => {},
  });

  const refresh = useCallback(() => {
    // TODO: replace mocks with real checks (Bluetooth, permissions, notifications, battery saver)
    setState(prev => ({...prev, loading: true}));
    setTimeout(() => {
      setState({
        bluetoothEnabled: true,
        nearbyPermission: 'granted',
        notificationsEnabled: Platform.OS === 'ios', // mock variation by platform
        batterySaverEnabled: false,
        loading: false,
        refresh,
      });
    }, 150);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return state;
};

export default useDeviceStatus;
