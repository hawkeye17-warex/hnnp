import {createHmac} from 'crypto';

export const getCurrentTimeSlot = (intervalSeconds = 15): number => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.floor(nowSeconds / intervalSeconds);
};

export const generateToken = (deviceSecret: string, timeSlot: number) => {
  const hmac = createHmac('sha256', Buffer.from(deviceSecret, 'hex'));
  hmac.update(Buffer.allocUnsafe(4).writeUInt32BE(timeSlot, 0));
  const digest = hmac.digest();

  const tokenPrefix = digest.subarray(0, 16);
  const mac = digest.subarray(16, 24);

  return {tokenPrefix, mac};
};

type PayloadParts = {
  timeSlot: number;
  tokenPrefix: Uint8Array;
  mac: Uint8Array;
  version?: number;
  flags?: number;
};

export const buildPayloadBytes = ({
  timeSlot,
  tokenPrefix,
  mac,
  version = 1,
  flags = 0,
}: PayloadParts): Uint8Array => {
  const payload = Buffer.alloc(30);
  payload.writeUInt8(version, 0);
  payload.writeUInt8(flags, 1);
  payload.writeUInt32BE(timeSlot, 2);

  Buffer.from(tokenPrefix).copy(payload, 6, 0, 16);
  Buffer.from(mac).copy(payload, 22, 0, 8);

  return new Uint8Array(payload);
};
