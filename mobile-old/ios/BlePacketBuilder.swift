import Foundation
import CryptoKit

/// BlePacketBuilder handles MAC generation and packet assembly for v2 BLE packets.
///
/// MAC spec (v2):
///   mac_full = HMAC-SHA256(device_auth_key,
///               version || flags || encode_uint32(time_slot) || token_prefix)
///   mac = first 8 bytes of mac_full
enum BlePacketBuilder {

    /// Compute the 8-byte MAC for a v2 BLE packet.
    static func computeMac(
        deviceAuthKey: Data,
        version: UInt8,
        flags: UInt8,
        timeSlot: UInt32,
        tokenPrefix: Data
    ) throws -> Data {
        guard tokenPrefix.count == 16 else {
            throw BlePacketError.invalidTokenPrefixLength
        }

        var message = Data()
        message.append(contentsOf: [version, flags])
        message.append(encodeUint32BE(timeSlot))
        message.append(tokenPrefix)

        let key = SymmetricKey(data: deviceAuthKey)
        let macFull = HMAC<SHA256>.authenticationCode(for: message, using: key)
        let macData = Data(macFull)
        return macData.prefix(8)
    }

    /// Helper to build a BlePacketV2 from its fields and a precomputed MAC.
    ///
    /// This matches the helper name requested:
    ///   buildBlePacketV2(version, flags, time_slot, token_prefix, mac)
    static func buildBlePacketV2(
        version: UInt8,
        flags: UInt8,
        timeSlot: UInt32,
        tokenPrefix: Data,
        mac: Data
    ) throws -> BlePacketV2 {
        guard tokenPrefix.count == 16 else {
            throw BlePacketError.invalidTokenPrefixLength
        }
        guard mac.count == 8 else {
            throw BlePacketError.invalidMacLength
        }
        return BlePacketV2(
            version: version,
            flags: flags,
            timeSlot: timeSlot,
            tokenPrefix: tokenPrefix,
            mac: mac
        )
    }

    private static func encodeUint32BE(_ value: UInt32) -> Data {
        var bigEndian = value.bigEndian
        return withUnsafeBytes(of: &bigEndian) { Data($0) }
    }
}

enum BlePacketError: Error {
    case invalidTokenPrefixLength
    case invalidMacLength
}

