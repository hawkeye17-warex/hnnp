import { NativeModules } from 'react-native';

const { BLEAdvertiserModule } = NativeModules;

export const startAdvertising = async (payload: Uint8Array) => {
  // Pass the payload as an array of numbers to the native module.
  const payloadArray = Array.from(payload);
  BLEAdvertiserModule.startAdvertising(payloadArray);
};

export const stopAdvertising = async () => {
  BLEAdvertiserModule.stopAdvertising();
};

export default {
  startAdvertising,
  stopAdvertising,
};
