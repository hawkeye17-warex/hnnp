export function encodeUint32BE(value: number): Buffer {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`encodeUint32BE: invalid value ${value}`);
  }

  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(value >>> 0, 0);
  return buf;
}

