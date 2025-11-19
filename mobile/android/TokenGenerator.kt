package com.hnnp.device

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * TokenGenerator implements v2 token derivation for HNNP.
 *
 * Spec (v2):
 *   full_token = HMAC-SHA256(device_auth_key, encode_uint32(time_slot) || "hnnp_v2_presence")
 *   token_prefix = first 16 bytes of full_token
 *
 * This helper returns { time_slot, token_prefix } for the BLE layer
 * and does not persist any derived keys or tokens.
 */
object TokenGenerator {

    private const val HMAC_ALGORITHM = "HmacSHA256"
    private const val CONTEXT_STRING = "hnnp_v2_presence"
    private const val TOKEN_PREFIX_LENGTH_BYTES = 16

    data class PresenceToken(
        val timeSlot: Long,
        val tokenPrefix: ByteArray,
    )

    /**
     * Derive full_token and token_prefix from device_auth_key and time_slot.
     *
     * @param deviceAuthKey 32-byte HMAC key derived from device_secret.
     * @param timeSlot      32-bit unsigned time slot value.
     */
    fun derivePresenceToken(deviceAuthKey: ByteArray, timeSlot: Long): PresenceToken {
        val message = encodeUint32(timeSlot) + CONTEXT_STRING.toByteArray(Charsets.UTF_8)

        val keySpec = SecretKeySpec(deviceAuthKey, HMAC_ALGORITHM)
        val mac = Mac.getInstance(HMAC_ALGORITHM)
        mac.init(keySpec)
        val fullToken = mac.doFinal(message)

        val tokenPrefix = fullToken.copyOfRange(0, TOKEN_PREFIX_LENGTH_BYTES)

        return PresenceToken(
            timeSlot = timeSlot,
            tokenPrefix = tokenPrefix,
        )
    }

    private fun encodeUint32(value: Long): ByteArray {
        require(value >= 0 && value <= 0xFFFFFFFFL) {
            "encodeUint32: value out of range for uint32: $value"
        }

        return byteArrayOf(
            ((value shr 24) and 0xFF).toByte(),
            ((value shr 16) and 0xFF).toByte(),
            ((value shr 8) and 0xFF).toByte(),
            (value and 0xFF).toByte(),
        )
    }
}

