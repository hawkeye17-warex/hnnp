package com.hnnp.device

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * BlePacketBuilder handles MAC generation and packet assembly for v2 BLE packets.
 *
 * MAC spec (v2):
 *   mac_full = HMAC-SHA256(device_auth_key,
 *               version || flags || encode_uint32(time_slot) || token_prefix)
 *   mac = first 8 bytes of mac_full
 */
object BlePacketBuilder {

    private const val HMAC_ALGORITHM = "HmacSHA256"

    /**
     * Compute the 8-byte MAC for a v2 BLE packet.
     */
    fun computeMac(
        deviceAuthKey: ByteArray,
        version: Byte,
        flags: Byte,
        timeSlot: Long,
        tokenPrefix: ByteArray,
    ): ByteArray {
        require(tokenPrefix.size == 16) { "tokenPrefix must be 16 bytes" }

        val keySpec = SecretKeySpec(deviceAuthKey, HMAC_ALGORITHM)
        val mac = Mac.getInstance(HMAC_ALGORITHM)
        mac.init(keySpec)

        val message = ByteArray(1 + 1 + 4 + 16)
        var offset = 0
        message[offset++] = version
        message[offset++] = flags

        val tsBytes = encodeUint32(timeSlot)
        System.arraycopy(tsBytes, 0, message, offset, 4)
        offset += 4

        System.arraycopy(tokenPrefix, 0, message, offset, 16)

        val macFull = mac.doFinal(message)
        return macFull.copyOfRange(0, 8)
    }

    /**
     * Helper to build a BlePacketV2 from its fields and a precomputed MAC.
     *
     * This matches the helper name requested:
     *   buildBlePacketV2(version, flags, time_slot, token_prefix, mac)
     */
    fun buildBlePacketV2(
        version: Byte,
        flags: Byte,
        timeSlot: Long,
        tokenPrefix: ByteArray,
        mac: ByteArray,
    ): BlePacketV2 = BlePacketV2(
        version = version,
        flags = flags,
        timeSlot = timeSlot,
        tokenPrefix = tokenPrefix,
        mac = mac,
    )

    private fun encodeUint32(value: Long): ByteArray {
        require(value >= 0 && value <= 0xFFFFFFFFL) { "encodeUint32: value out of range: $value" }
        return byteArrayOf(
            ((value shr 24) and 0xFF).toByte(),
            ((value shr 16) and 0xFF).toByte(),
            ((value shr 8) and 0xFF).toByte(),
            (value and 0xFF).toByte(),
        )
    }
}

