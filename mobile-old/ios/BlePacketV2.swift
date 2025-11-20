import Foundation

/// In-memory representation of an HNNP v2 BLE packet.
///
/// Fields map directly to the v2 spec:
/// - version: 1 byte (0x02)
/// - flags: 1 byte
/// - time_slot: uint32
/// - token_prefix: 16 bytes
/// - mac: 8 bytes
struct BlePacketV2 {
    let version: UInt8
    let flags: UInt8
    let timeSlot: UInt32
    let tokenPrefix: Data
    let mac: Data

    init(version: UInt8, flags: UInt8, timeSlot: UInt32, tokenPrefix: Data, mac: Data) {
        precondition(tokenPrefix.count == 16, "tokenPrefix must be 16 bytes")
        precondition(mac.count == 8, "mac must be 8 bytes")
        self.version = version
        self.flags = flags
        self.timeSlot = timeSlot
        self.tokenPrefix = tokenPrefix
        self.mac = mac
    }

    /// Serialize to the 30-byte BLE payload:
    ///   version || flags || encode_uint32(time_slot) || token_prefix || mac
    func toPayload() -> Data {
        var payload = Data()
        payload.append(contentsOf: [version, flags])
        payload.append(encodeUint32BE(timeSlot))
        payload.append(tokenPrefix)
        payload.append(mac)
        return payload
    }

    private func encodeUint32BE(_ value: UInt32) -> Data {
        var bigEndian = value.bigEndian
        return withUnsafeBytes(of: &bigEndian) { Data($0) }
    }
}

