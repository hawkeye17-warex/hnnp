import * as Keychain from 'react-native-keychain';

const SERVICE = 'nearid_device_secret';

const generateRandomSecret = () => {
  const bytes = new Uint8Array(32);
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const getOrCreateDeviceSecret = async (): Promise<string> => {
  const existing = await Keychain.getGenericPassword({service: SERVICE});
  if (existing && existing.password) {
    return existing.password;
  }

  const secret = generateRandomSecret();
  await Keychain.setGenericPassword('device', secret, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
  return secret;
};

export const clearDeviceSecret = async () => {
  await Keychain.resetGenericPassword({service: SERVICE});
};
