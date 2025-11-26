import HmacSHA256 from 'crypto-js/hmac-sha256';
import encHex from 'crypto-js/enc-hex';

function hmacSha256Hex(message: string | Buffer, key: string): string {
  // Same result as Node's createHmac('sha256', key).update(message).digest('hex')
  const messageWord = Buffer.isBuffer(message)
    ? encHex.parse(message.toString('hex'))
    : message;
  return HmacSHA256(messageWord, key).toString(encHex);
}

export const getCurrentTimeSlot = (intervalSeconds = 15): number => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.floor(nowSeconds / intervalSeconds);
};

export const generateToken = (deviceSecret: string, timeSlot: number) => {
  const timeSlotBytes = Buffer.allocUnsafe(4);
  timeSlotBytes.writeUInt32BE(timeSlot, 0);

  const secretBytes = Buffer.from(deviceSecret, 'hex');

  const digestHex = hmacSha256Hex(timeSlotBytes, secretBytes.toString('hex'));
  const digest = Buffer.from(digestHex, 'hex');

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
