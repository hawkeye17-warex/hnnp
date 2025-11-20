package com.hnnp.device

import android.content.Context
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * DeviceSecretManager is responsible for generating and securely storing
 * the 32-byte device_secret as defined in protocol/spec.md (v2).
 *
 * - device_secret: 32 random bytes (CSPRNG)
 * - Stored only on device, in OS secure storage:
 *   - Android: Keystore / EncryptedSharedPreferences
 *
 * This helper never logs or prints the device_secret.
 */
object DeviceSecretManager {

    private const val PREF_FILE_NAME = "hnnp_device_secret_prefs"
    private const val PREF_KEY_DEVICE_SECRET = "device_secret"
    private const val DEVICE_SECRET_NUM_BYTES = 32
    private const val DEVICE_AUTH_CONTEXT = "hnnp_device_auth_v2"

    /**
     * Returns the existing device_secret if present, otherwise generates a new
     * 32-byte secret using a cryptographically secure RNG, stores it in
     * EncryptedSharedPreferences backed by Android Keystore, and returns it.
     */
    fun getOrCreateDeviceSecret(context: Context): ByteArray {
        val prefs = createSecurePrefs(context)

        val existing = prefs.getString(PREF_KEY_DEVICE_SECRET, null)
        if (existing != null) {
            return Base64.decode(existing, Base64.NO_WRAP)
        }

        val secret = ByteArray(DEVICE_SECRET_NUM_BYTES)
        SecureRandom().nextBytes(secret)

        val encoded = Base64.encodeToString(secret, Base64.NO_WRAP)
        prefs.edit().putString(PREF_KEY_DEVICE_SECRET, encoded).apply()

        return secret
    }

    /**
     * Derive device_auth_key from a given device_secret using:
     *
     *   device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")
     *
     * The derived key is kept only in memory by the caller and MUST NOT
     * be persisted separately unless absolutely required.
     */
    fun deriveDeviceAuthKey(deviceSecret: ByteArray): ByteArray {
        val keySpec = SecretKeySpec(deviceSecret, "HmacSHA256")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(keySpec)
        val contextBytes = DEVICE_AUTH_CONTEXT.toByteArray(Charsets.UTF_8)
        return mac.doFinal(contextBytes)
    }

    private fun createSecurePrefs(context: Context) =
        EncryptedSharedPreferences.create(
            PREF_FILE_NAME,
            MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
}
