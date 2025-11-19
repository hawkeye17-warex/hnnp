package com.hnnp.device

import android.content.Context
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import java.security.SecureRandom

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

    private fun createSecurePrefs(context: Context) =
        EncryptedSharedPreferences.create(
            PREF_FILE_NAME,
            MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
}

