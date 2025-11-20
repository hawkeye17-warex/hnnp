import Foundation
import Security
import CryptoKit

/// DeviceSecretManager handles install-time generation and secure storage
/// of the 32-byte device_secret as defined in protocol/spec.md (v2).
///
/// - device_secret: 32 random bytes from a CSPRNG
/// - Stored only on device, in the iOS Keychain (Secure Enclave backed when available).
///
/// This helper never logs or prints the device_secret.
enum DeviceSecretManager {
    private static let keychainService = "com.hnnp.device"
    private static let deviceSecretAccount = "device_secret"
    private static let deviceSecretNumBytes = 32
    private static let deviceAuthContext = "hnnp_device_auth_v2"

    /// Returns the existing device_secret if present, otherwise generates a new
    /// 32-byte secret using SecRandomCopyBytes, stores it in Keychain, and returns it.
    static func getOrCreateDeviceSecret() throws -> Data {
        if let existing = try readDeviceSecret() {
            return existing
        }

        var secret = Data(count: deviceSecretNumBytes)
        let result = secret.withUnsafeMutableBytes { buffer in
            SecRandomCopyBytes(kSecRandomDefault, deviceSecretNumBytes, buffer.baseAddress!)
        }

        guard result == errSecSuccess else {
            throw DeviceSecretError.randomGenerationFailed(status: result)
        }

        try storeDeviceSecret(secret)
        return secret
    }

    /// Derive device_auth_key from a given device_secret using:
    ///
    ///   device_auth_key = HMAC-SHA256(device_secret, "hnnp_device_auth_v2")
    ///
    /// The derived key is kept only in memory by the caller and MUST NOT
    /// be persisted separately unless absolutely required.
    static func deriveDeviceAuthKey(from deviceSecret: Data) -> Data {
        let key = SymmetricKey(data: deviceSecret)
        let contextData = Data(deviceAuthContext.utf8)
        let mac = HMAC<SHA256>.authenticationCode(for: contextData, using: key)
        return Data(mac)
    }

    private static func readDeviceSecret() throws -> Data? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: deviceSecretAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess, let data = item as? Data else {
            throw DeviceSecretError.keychainReadFailed(status: status)
        }

        return data
    }

    private static func storeDeviceSecret(_ secret: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: deviceSecretAccount,
            kSecValueData as String: secret,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        // Try to add; if item exists, update.
        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecDuplicateItem {
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: keychainService,
                kSecAttrAccount as String: deviceSecretAccount
            ]

            let attributesToUpdate: [String: Any] = [
                kSecValueData as String: secret
            ]

            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributesToUpdate as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw DeviceSecretError.keychainWriteFailed(status: updateStatus)
            }
        } else if status != errSecSuccess {
            throw DeviceSecretError.keychainWriteFailed(status: status)
        }
    }
}

enum DeviceSecretError: Error {
    case randomGenerationFailed(status: OSStatus)
    case keychainReadFailed(status: OSStatus)
    case keychainWriteFailed(status: OSStatus)
}
