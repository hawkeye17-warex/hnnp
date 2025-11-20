import {useEffect, useState} from 'react';

import {startAdvertising, stopAdvertising} from '../ble/bleAdvertiser';
import {buildPayloadBytes, generateToken, getCurrentTimeSlot} from '../hnnp/tokenGenerator';
import {getOrCreateDeviceSecret} from '../storage/deviceSecret';

type BroadcastState = {
  broadcasting: boolean;
  loading: boolean;
  lastError: string | null;
};

const usePresenceBroadcast = (intervalMs = 15000): BroadcastState => {
  const [broadcasting, setBroadcasting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const broadcastOnce = async () => {
      try {
        const secret = await getOrCreateDeviceSecret();
        const timeSlot = getCurrentTimeSlot();
        const {tokenPrefix, mac} = generateToken(secret, timeSlot);
        const payload = buildPayloadBytes({timeSlot, tokenPrefix, mac});
        await startAdvertising(payload);
        if (!cancelled) {
          setBroadcasting(true);
          setLastError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setBroadcasting(false);
          setLastError(err?.message ?? 'Failed to start presence broadcast');
          setLoading(false);
        }
      }
    };

    broadcastOnce();
    timer = setInterval(broadcastOnce, intervalMs);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
      stopAdvertising().catch(() => {});
    };
  }, [intervalMs]);

  return {broadcasting, loading, lastError};
};

export default usePresenceBroadcast;
