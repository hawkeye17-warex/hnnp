package com.hnnp.device

import android.net.Uri
import android.util.Base64
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * RegistrationBlobGenerator creates the registration_blob used during onboarding,
 * as defined in protocol/spec.md (v2):
 *
 *   registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2") || device_local_id
 *
 * where device_local_id is a random identifier generated on device.
 *
 * The blob is intended to be surfaced via a secure transport such as QR code
 * or deep link, and NEVER logged or stored in plaintext analytics.
 */
object RegistrationBlobGenerator {

    private const val HMAC_ALGORITHM = "HmacSHA256"
    private const val REG_CONTEXT = "hnnp_reg_v2"
    private const val DEVICE_LOCAL_ID_NUM_BYTES = 16

    data class RegistrationBlob(
        val mac: ByteArray,
        val deviceLocalId: ByteArray,
        val encodedBlob: String,
    )

    /**
     * Generate registration_blob from a given device_auth_key.
     *
     * The returned blob is base64-url encoded and suitable for embedding in a QR code
     * or deep link.
     */
    fun generate(deviceAuthKey: ByteArray): RegistrationBlob {
        val keySpec = SecretKeySpec(deviceAuthKey, HMAC_ALGORITHM)
        val mac = Mac.getInstance(HMAC_ALGORITHM)
        mac.init(keySpec)

        val contextBytes = REG_CONTEXT.toByteArray(Charsets.UTF_8)
        val macBytes = mac.doFinal(contextBytes)

        val deviceLocalId = ByteArray(DEVICE_LOCAL_ID_NUM_BYTES)
        SecureRandom().nextBytes(deviceLocalId)

        val combined = ByteArray(macBytes.size + deviceLocalId.size)
        System.arraycopy(macBytes, 0, combined, 0, macBytes.size)
        System.arraycopy(deviceLocalId, 0, combined, macBytes.size, deviceLocalId.size)

        val encoded = Base64.encodeToString(
            combined,
            Base64.NO_WRAP or Base64.NO_PADDING or Base64.URL_SAFE,
        )

        return RegistrationBlob(
            mac = macBytes,
            deviceLocalId = deviceLocalId,
            encodedBlob = encoded,
        )
    }

    /**
     * Build a registration deep link URI for onboarding flows.
     *
     * The transport details are non-normative; this example uses a custom scheme:
     *   hnnp://register?blob=<base64url-blob>
     */
    fun buildDeepLink(encodedBlob: String): Uri {
        return Uri.parse("hnnp://register")
            .buildUpon()
            .appendQueryParameter("blob", encodedBlob)
            .build()
    }
}

