package com.hnnp.device

import android.bluetooth.le.AdvertiseData
import android.os.ParcelUuid
import java.util.UUID

/**
 * BleAdvertisingPayload builds the BLE advertising data for HNNP v2.
 *
 * The 30-byte v2 payload is placed into Service Data with a fixed service UUID.
 *
 * Spec requirements satisfied:
 * - version = 0x02 (set when constructing BlePacketV2)
 * - flags = 0x00 (current base spec)
 * - total payload length = exactly 30 bytes
 */
object BleAdvertisingPayload {

    // Pre-agreed HNNP v2 service UUID used for Service Data advertisements.
    // This is not part of the 30-byte payload defined in spec.md; it is the
    // BLE service identifier that receivers use to filter relevant packets.
    private val SERVICE_UUID: UUID = UUID.fromString("0000F0E0-0000-1000-8000-00805F9B34FB")

    /**
     * Build AdvertiseData containing the 30-byte HNNP v2 payload in Service Data.
     *
     * Callers must construct BlePacketV2 with:
     * - version = 0x02
     * - flags = 0x00
     */
    fun buildServiceData(packet: BlePacketV2): AdvertiseData {
        val payload = packet.toPayload()
        require(payload.size == 30) { "HNNP v2 BLE payload must be exactly 30 bytes" }

        val uuid = ParcelUuid(SERVICE_UUID)

        return AdvertiseData.Builder()
            .addServiceUuid(uuid)
            .addServiceData(uuid, payload)
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .build()
    }
}

