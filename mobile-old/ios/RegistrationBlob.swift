import Foundation
import CryptoKit
import Security

/// RegistrationBlobGenerator creates the registration_blob used during onboarding,
/// as defined in protocol/spec.md (v2):
///
///   registration_blob = HMAC-SHA256(device_auth_key, "hnnp_reg_v2") || device_local_id
///
/// where device_local_id is a random identifier generated on device.
///
/// The blob is intended to be surfaced via a secure transport such as QR code
/// or deep link, and MUST NOT be logged or sent to untrusted services.
enum RegistrationBlobGenerator {
    private static let regContext = "hnnp_reg_v2"
    private static let deviceLocalIdNumBytes = 16

    struct RegistrationBlob {
        let mac: Data
        let deviceLocalId: Data
        let encodedBlob: String
    }

    /// Generate registration_blob from a given device_auth_key.
    ///
    /// The returned blob is base64-url encoded and suitable for embedding in a QR code
    /// or deep link.
    static func generate(deviceAuthKey: Data) throws -> RegistrationBlob {
        let key = SymmetricKey(data: deviceAuthKey)
        let contextData = Data(regContext.utf8)
        let macAuth = HMAC<SHA256>.authenticationCode(for: contextData, using: key)
        let macData = Data(macAuth)

        var deviceLocalId = Data(count: deviceLocalIdNumBytes)
        let status = deviceLocalId.withUnsafeMutableBytes { buffer in
            SecRandomCopyBytes(kSecRandomDefault, deviceLocalIdNumBytes, buffer.baseAddress!)
        }
        guard status == errSecSuccess else {
            throw RegistrationBlobError.randomGenerationFailed(status: status)
        }

        var combined = Data()
        combined.append(macData)
        combined.append(deviceLocalId)

        let encoded = combined.base64EncodedString(options: [.endLineWithLineFeed])
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")

        return RegistrationBlob(
            mac: macData,
            deviceLocalId: deviceLocalId,
            encodedBlob: encoded
        )
    }

    /// Build a registration deep link URL for onboarding flows.
    ///
    /// The transport details are non-normative; this example uses a custom scheme:
    ///   hnnp://register?blob=<base64url-blob>
    static func buildDeepLink(encodedBlob: String) -> URL? {
        var components = URLComponents()
        components.scheme = "hnnp"
        components.host = "register"
        components.queryItems = [
            URLQueryItem(name: "blob", value: encodedBlob)
        ]
        return components.url
    }
}

enum RegistrationBlobError: Error {
    case randomGenerationFailed(status: OSStatus)
}

