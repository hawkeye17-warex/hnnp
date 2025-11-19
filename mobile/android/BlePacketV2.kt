package com.hnnp.device

/**
 * In-memory representation of an HNNP v2 BLE packet.
 *
 * Fields map directly to the v2 spec:
 * - version: 1 byte (0x02)
 * - flags: 1 byte
 * - time_slot: uint32
 * - token_prefix: 16 bytes
 * - mac: 8 bytes
 */
data class BlePacketV2(
    val version: Byte,
    val flags: Byte,
    val timeSlot: Long,
    val tokenPrefix: ByteArray,
    val mac: ByteArray,
) {
    init {
        require(tokenPrefix.size == 16) { "tokenPrefix must be 16 bytes" }
        require(mac.size == 8) { "mac must be 8 bytes" }
    }

    /**
     * Serialize to the 30-byte BLE payload:
     *   version || flags || encode_uint32(time_slot) || token_prefix || mac
     */
    fun toPayload(): ByteArray {
        val payload = ByteArray(1 + 1 + 4 + 16 + 8)
        var offset = 0
        payload[offset++] = version
        payload[offset++] = flags

        val tsBytes = encodeUint32(timeSlot)
        System.arraycopy(tsBytes, 0, payload, offset, 4)
        offset += 4

        System.arraycopy(tokenPrefix, 0, payload, offset, 16)
        offset += 16

        System.arraycopy(mac, 0, payload, offset, 8)

        return payload
    }

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

