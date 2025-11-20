import Foundation
import CryptoKit

/// TokenGenerator implements v2 token derivation for HNNP.
///
/// Spec (v2):
///   full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || "hnnp_v2_presence")
///   token_prefix = first 16 bytes of full_token
///
/// This helper returns { time_slot, token_prefix } for the BLE layer
/// and does not persist any derived keys or tokens.
enum TokenGenerator {
    private static let contextString = "hnnp_v2_presence"
    private static let tokenPrefixLengthBytes = 16

    struct PresenceToken {
        let timeSlot: Int64
        let tokenPrefix: Data
    }

    /// Derive full_token and token_prefix from device_auth_key and time_slot.
    ///
    /// - Parameters:
    ///   - deviceAuthKey: 32-byte key derived from device_secret.
    ///   - timeSlot: 32-bit unsigned time slot value.
    ///   - localBeaconNonce: optional nonce broadcast by receiver (wormhole mitigation feature).
    static func derivePresenceToken(
        deviceAuthKey: Data,
        timeSlot: Int64,
        localBeaconNonce: Data? = nil
    ) throws -> PresenceToken {
        guard timeSlot >= 0 && timeSlot <= Int64(UInt32.max) else {
            throw TokenGeneratorError.timeSlotOutOfRange
        }

        var message = encodeUint32BE(UInt32(timeSlot))
        if let nonce = localBeaconNonce {
            message.append(nonce)
        }
        message.append(Data(contextString.utf8))

        let key = SymmetricKey(data: deviceAuthKey)
        let mac = HMAC<SHA256>.authenticationCode(for: message, using: key)
        let fullToken = Data(mac)

        let prefix = fullToken.prefix(tokenPrefixLengthBytes)

        return PresenceToken(
            timeSlot: timeSlot,
            tokenPrefix: prefix
        )
    }

    private static func encodeUint32BE(_ value: UInt32) -> Data {
        var bigEndian = value.bigEndian
        return withUnsafeBytes(of: &bigEndian) { Data($0) }
    }
}

enum TokenGeneratorError: Error {
    case timeSlotOutOfRange
}
