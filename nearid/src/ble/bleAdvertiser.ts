// Stubbed BLE advertiser; replace with a platform-specific implementation.
export const startAdvertising = async (_payload: Uint8Array) => {
  // Intentionally no logging to avoid leaking payload contents.
  return;
};

export const stopAdvertising = async () => {
  return;
};

export default {
  startAdvertising,
  stopAdvertising,
};
