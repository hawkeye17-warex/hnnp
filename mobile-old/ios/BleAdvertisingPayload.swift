import Foundation
import CoreBluetooth

/// BleAdvertisingPayload builds the BLE advertising data for HNNP v2.
///
/// The 30-byte v2 payload is placed into Service Data with a fixed service UUID.
///
/// Spec requirements satisfied:
/// - version = 0x02 (set when constructing BlePacketV2)
/// - flags = 0x00 (current base spec)
/// - total payload length = exactly 30 bytes
enum BleAdvertisingPayload {

    // Pre-agreed HNNP v2 service UUID used for Service Data advertisements.
    // This is not part of the 30-byte payload; it is the BLE service identifier
    // receivers use to filter relevant packets.
    static let serviceUUID = CBUUID(string: "0000F0E0-0000-1000-8000-00805F9B34FB")

    /// Build advertisement data dictionary containing Service Data for HNNP v2.
    ///
    /// The returned dictionary is suitable for CBPeripheralManager.startAdvertising(_:)
    /// and includes:
    /// - CBAdvertisementDataServiceUUIDsKey
    /// - CBAdvertisementDataServiceDataKey
    static func buildServiceData(from packet: BlePacketV2) -> [String: Any] {
        let payload = packet.toPayload()
        precondition(payload.count == 30, "HNNP v2 BLE payload must be exactly 30 bytes")

        return [
            CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
            CBAdvertisementDataServiceDataKey: [serviceUUID: payload]
        ]
    }
}

