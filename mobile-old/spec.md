# NearID Mobile App Specification v1 (Android and iOS)

This document defines the functional, UX, and technical behavior of the NearID mobile app for Android and iOS. The NearID app is the primary user-facing client for the Human Near-Network Protocol (HNNP) and is responsible for generating presence tokens, broadcasting over BLE, and showing users their presence status and history. This spec focuses on the mobile app only and assumes the HNNP Protocol Specification v3 (symmetric, fast, privacy-preserving) is implemented in the shared core library or platform-specific layer.

# 1. Scope and Goals

### 1.1 Scope

This spec covers:

* NearID mobile app behavior on Android and iOS
* User flows and screens
* Permissions and background behavior
* How the app interfaces with HNNP Cloud and external systems
* Storage, security, and privacy requirements on the device

It does not redefine the low-level token generation rules, BLE packet structure, or Cloud verification logic; those are fully described in the HNNP Protocol Specification v3.

### 1.2 Goals

* Provide a simple, trustworthy app for normal users (students, employees, visitors, patients) to:
  * Broadcast HNNP tokens passively
  * See their presence status in real time
  * View historical presence logs
  * Understand and control permissions and privacy
* Honor OS-level theme (light or dark) and accessibility guidelines
* Hide all developer/integration tools from normal users
* Ensure all cryptographic and privacy guarantees defined in HNNP v3 are preserved

### 1.3 Non-goals

* The app is not an admin panel, receiver controller, or EMR/HR system.
* The app does not directly manage organizations’ business logic (attendance policies, payroll, etc.).
* The app does not expose raw crypto or debugging tools to end users.

# 2. Platforms and Technology

### 2.1 Supported Platforms

* Android: Minimum supported version should allow Bluetooth LE scanning and advertising and modern permission model (recommended Android 8.0+; final minimum to be decided by engineering).
* iOS: Minimum iOS version supporting modern Bluetooth and background modes (recommended iOS 15+; final minimum to be decided by engineering).

### 2.2 Implementation Architecture

* Shared product logic:
  * Implement HNNP token rotation logic (device_secret, device_auth_key, time_slot, token_prefix, mac) as per HNNP v3.
* BLE:
  * Android: Native Bluetooth LE advertising APIs.
  * iOS: CoreBluetooth advertising APIs.
* UI:
  * Native UI or cross-platform (React Native / Flutter) allowed, but behavior must match this spec.
* Network:
  * HTTPS-only calls to HNNP Cloud and org backend(s).
  * JSON payloads for all API calls.

# 3. Terminology (Mobile Context)

* User: Human using the NearID app on their phone.
* Device: A single installation of the app on a phone; has its own device_secret and device_auth_key.
* Org: Tenant using HNNP (university, workplace, hospital, etc.).
* HNNP Cloud: Backend implementing HNNP Protocol v3 and presence processing.
* External System: Org’s system (e.g., attendance, HR, EMR) that integrates with HNNP.
* Presence Event: Single check-in instance as processed by HNNP Cloud.
* Presence History: Timeline of presence events for a device (and linked user).
* Link: Binding between (org_id, device_id) and user_ref, managed on the server side.

# 4. Relationship to HNNP Protocol

### 4.1 Token and BLE Requirements

The NearID app MUST:

* Generate and store a device_secret at first install in OS secure storage (Android Keystore / iOS Keychain).
* Derive device_auth_key and use it to generate full_token, token_prefix, mac, and time_slot according to HNNP Protocol Specification v3 (15-second rotation windows, HMAC-SHA256, 128-bit prefix, 64-bit mac).
* Broadcast BLE packets with the exact 30-byte payload defined in HNNP v3:
  * version (1 byte)
  * flags (1 byte)
  * time_slot (4 bytes)
  * token_prefix (16 bytes)
  * mac (8 bytes)

The app MUST NOT:

* Broadcast any personal identifier (email, ID, phone, name) over BLE.
* Include debug strings or static identifiers in BLE payloads.

### 4.2 Device Registration and Link Support

The app MUST:

* Derive device_auth_key from device_secret.
* Generate a registration_blob when requested, as defined in HNNP v3.
* Provide a mechanism to send this registration_blob to the org’s external system for linking (e.g., via deep link, QR code, or direct API call defined by the org integration).

The app itself does not directly call /v2/link; that is handled by external systems. It only generates registration_blob and can send it via agreed methods.

# 5. Permissions, Capabilities, and OS Integration

### 5.1 Permissions

The app MUST request only essential permissions:

* Bluetooth and Nearby Devices:
  * Android:
    * Use platform-appropriate Bluetooth and Nearby Devices permissions.
    * Do not request coarse or fine location permissions solely for BLE.
  * iOS:
    * Bluetooth permission (CoreBluetooth).
* Notifications:
  * Optionally requested to show presence alerts and error notifications.

The app MUST NOT request:

* GPS location permissions (fine or coarse), unless a future feature explicitly requires it and is documented separately.
* Camera, contacts, or other sensitive permissions for the base NearID experience.

### 5.2 Background Behavior

* BLE advertising:
  * The app SHOULD continue advertising tokens in the background within OS constraints.
  * On iOS, the app MUST follow CoreBluetooth background mode rules and may be limited by OS; presence reliability expectations must be documented clearly in FAQ.
* The app MUST NOT:
  * Run unnecessary CPU-intensive tasks in background.
  * Attempt to bypass OS background restrictions in unsupported ways.

### 5.3 Theme and Accessibility

* The app MUST follow system appearance:
  * Light mode when system is light.
  * Dark mode when system is dark.
  * No separate hidden theme toggle unless clearly exposed in Settings.
* Both themes MUST:
  * Provide sufficient contrast for all text and major UI elements (WCAG AA or better for normal text).
  * Use the same information architecture and component structure.
* The app SHOULD:
  * Respect OS font scaling and accessibility settings (large text, bold text).
  * Provide meaningful labels for screen readers for all actionable elements.

# 6. App States and Lifecycle

### 6.1 Core States

* Uninitialized:
  * App first launch, device_secret not generated.
* Onboarding:
  * User has not completed login/linking and permission setup.
* Ready:
  * User logged in, minimal required permissions granted, BLE advertising actively or passively working.
* Limited:
  * Key permission disabled (e.g., Bluetooth off), app still runs but shows clear warnings and may not verify presence.
* Signed-out:
  * User has explicitly signed out; app stops advertising and presence tracking but retains minimal local structure.

### 6.2 State Transitions

* First launch → Uninitialized → generate device_secret → Onboarding.
* Onboarding completed → Ready if required permissions are granted.
* If Bluetooth or required permissions are revoked → Limited state; the app surfaces banners and instructions and attempts to re-enter Ready once fixed.
* Sign out → Signed-out; advertising disabled, presence history may be cleared depending on policy and user choice.

# 7. Navigation and Information Architecture

The NearID app MUST provide a simple three-tab layout:

* Tab 1: Presence (Home)
* Tab 2: History
* Tab 3: Settings

Each tab has its own top-level screen and possible sub-screens as specified below.

# 8. Screen Specifications

### 8.1 Onboarding Flow

###### 8.1.1 Welcome Screen

* Content:
  * NearID logo and name.
  * Short description: Instant, private presence verification.
  * Primary button: Get Started.
* Behavior:
  * Tapping Get Started proceeds to organization / account selection or login.

###### 8.1.2 Organization/Identity Screen

* Fields and actions:
  * For invited users: email field or magic link flow.
  * Option to choose organization if app supports multiple orgs per device.
* Behavior:
  * On success, app obtains org_id and user identity token (from org auth or SSO).
  * App stores org and user association locally.
* External integration detail:
  * Authentication specifics (OAuth, SAML, custom) are handled by the org’s authentication flows; NearID app only handles redirection and token reception.

###### 8.1.3 Permissions Setup Screens

* Bluetooth / Nearby Devices:
  * Explanation of why Bluetooth is needed.
  * Button that triggers OS permission dialog.
* Notifications:
  * Short explanation that notifications are used for presence confirmations and issues.
  * Button that triggers OS notification permission.

The app MUST gracefully handle the user denying these permissions and show them how to enable them later in Settings.

###### 8.1.4 Brief Usage Explainer

* A series of 2–3 short slides summarizing:
  * Phone broadcasts anonymous tokens when near receivers.
  * HNNP Cloud verifies presence for your org.
  * No GPS tracking; token-based proximity only.
* Skip button allowed.

### 8.2 Presence Tab (Home)

###### 8.2.1 Main Layout

* Top bar:
  * Title: NearID.
  * Small chip showing current org or site name.
  * Profile avatar or initials that opens Account details.
* Main status card:
  * Large visual presence indicator (ring or shield).
  * Status text states exactly one of:
    * Verified
    * Nearby – verifying…
    * Not detected
    * Bluetooth off
    * No receiver nearby
    * Limited mode (when permissions missing)
  * Subtext showing:
    * Place name (friendly label for receiver or zone).
    * Time of last verification (Just now, x minutes ago, or Last verified at HH:MM).

###### 8.2.2 Actions and Secondary Info

* Primary action:
  * Send ping:
    * For platforms or modes where automatic presence may be delayed or limited (e.g., iOS restrictions).
    * Triggers a manual broadcast or presence-check request (implementation detail).
* Secondary info:
  * Today summary:
    * Count of verified events today.
    * Optional total verified duration (if org uses session aggregation; otherwise this may be omitted).
  * Recent places:
    * Small list of last 2–3 places with time stamps.

###### 8.2.3 Error and Warning States

* If Bluetooth required permission is off or missing:
  * Prominent banner: Bluetooth or Nearby Devices disabled. Tap to fix.
* If OS-level battery saver or restricted background mode is likely to affect presence:
  * Non-blocking warning: Battery saver may slow background detection.
* If no receivers are detected for long period:
  * Soft informational message: No NearID receivers nearby.

### 8.3 History Tab (Presence Logs)

###### 8.3.1 Main History List

* Group logs by date sections:
  * Today
  * Yesterday
  * This Week
  * Earlier
* Each log entry displays:
  * Time.
  * Place name.
  * Status badge:
    * Verified (success)
    * Verification failed (error)
    * Unknown or pending (neutral).
  * Additional hint for manual vs automatic: small icon or text.

###### 8.3.2 Filters and Search

* Filter bar (top or via button):
  * Date range (From, To).
  * Status filter (All, Verified, Failed).
  * Place filter (optional if org sends list of place IDs/names).
* Search:
  * Optional keyword search on place names (if implemented on server and exposed via API).

###### 8.3.3 History Detail Screen

Tapping a history item opens a detail view with:

* Overall status:
  * Large icon and text (Verified, Failed, etc.).
* Place:
  * Human-readable name and internal label if needed.
* Time:
  * Exact timestamp (date and time).
* Source:
  * Auto presence or Manual ping.
* Receiver ID / location:
  * For transparency, show friendly label; raw receiver_id may be shown secondary if needed for support.
* Explanation:
  * If failed: short reason, for example:
    * Bluetooth was off at the time.
    * Token mismatch detected by server.
    * Device clock skew too large (advanced; may be simplified).
  * If verified: simple success message.

### 8.4 Settings Tab

Settings is divided into clearly labeled sections.

###### 8.4.1 Account

* Fields:
  * Name.
  * Email.
  * Organization(s) the user belongs to.
* Actions:
  * Switch org (if multiple are supported).
  * Sign out:
    * Signs user out, stops BLE advertising, and optionally clears history according to policy and user confirmation.

###### 8.4.2 Notifications

* Toggles:
  * Presence verified alerts.
  * Verification problems or issues.
  * Important announcements from my organization (optional and controlled by org config).
* Behavior:
  * Changing toggles updates local preferences and, where necessary, push notification subscriptions.

###### 8.4.3 Devices

* Information:
  * This device:
    * Device model and OS version.
    * Last seen time (from Cloud view).
  * Other linked devices:
    * Only if multiple devices per user are supported by HNNP Cloud and org policies.
* Actions:
  * Remove other devices (e.g., revoke older phone if supported via backend API).
  * Force re-onboarding if necessary (e.g., if security requirements change).

###### 8.4.4 Device Status

This may appear inside Settings or as a dedicated section on the Presence screen (or both).

* Indicators:
  * Bluetooth: On or Off.
  * Nearby Devices (Android): Allowed or Not allowed.
  * Notifications: Allowed or Not allowed.
  * Battery saver: On or Off, with note about impact.
* Actions:
  * Each indicator may have a Fix or Open system settings button to guide user to the appropriate OS setting screen.

###### 8.4.5 Privacy

* Static content explaining:
  * HNNP uses anonymous rotating tokens; no personal data in BLE packets.
  * No GPS tracking or map-based location usage.
  * Presence is derived from proximity to receivers and processed by HNNP Cloud and org systems.
* Actions:
  * Download my history:
    * Triggers an API request to export presence history (email link or in-app download, depending on backend implementation).
  * Delete my account:
    * Initiates a request to delete user data in Cloud and unlink devices.
    * Requires explicit confirmation and possibly a second factor depending on org policy.

###### 8.4.6 Security

* Options:
  * Require device-level authentication (Face ID, Touch ID, or device PIN) to open NearID (optional feature).
  * View active sessions or devices if exposed by backend.
* Behavior:
  * If enabled, the app requests OS authentication when opened or after a configurable idle timeout.

###### 8.4.7 Help and About

* Help:
  * FAQ entries such as:
    * Why am I not getting verified?
    * Do you track my GPS location?
    * What should I do if I lose my phone?
  * A quick diagnostic button:
    * Runs checks on Bluetooth, permissions, OS restrictions and presents pass/fail results.
* About:
  * App version.
  * Links to Terms of Use and Privacy Policy (hosted pages).
  * Possibly link to HNNP technical documentation for advanced users.

### 8.5 Optional: Join Session or Join Class

###### 8.5.1 Purpose

Some organizations may require a manual backup mechanism for presence (e.g., when BLE is unavailable or phone is too restricted).

###### 8.5.2 UI Placement

* On the Presence tab, near the bottom or via a secondary button, visible only when org configuration indicates it is enabled:
  * Text: Join session manually.
* Alternatively, this may appear in History when no automatic events are detected for a scheduled session.

###### 8.5.3 Behavior

* When tapped:
  * Shows a list of active sessions relevant to the user (e.g., upcoming or ongoing classes or shifts) fetched from the org backend.
  * Or shows a simple code entry field if the org uses manual codes.
* When user selects a session or enters a code:
  * The app sends a request to the org backend or HNNP-trusted API to mark presence for that session.
  * The event is clearly labeled as manual in the history.

This feature MUST be clearly indicated as manual and may be subject to the org’s own rules.

# 9. Developer and Integration Tools (Hidden)

Although the HNNP ecosystem has developer tools (signal debugging, RSSI viewing, token inspection, log export), these tools MUST NOT appear in the normal user interface.

* Visibility:
  * Dev tools are accessible only via hidden gesture or special build flags.
  * They are not described in this mobile spec because they are not part of the normal user flow.
* The production NearID app distributed to end users SHOULD have all developer debug interfaces disabled or gated behind internal flags and not reachable by normal user interaction.

# 10. Local Data Storage

### 10.1 Stored Data

The app MAY store locally:

* device_secret and related cryptographic material in OS secure storage.
* Short rolling cache of presence events for offline display (timestamps, place names, status).
* User profile basics (name, email, org_id).
* Configuration flags and preferences (notifications, theme preference if override is ever added, etc.).

### 10.2 Data Protection

* All sensitive keys MUST be stored only in secure OS key storage (iOS Keychain, Android Keystore or encrypted storage).
* No secrets such as device_secret, device_auth_key, receiver_secret, device_id_salt, or webhook_secret are ever stored in plaintext or logged.
* Local logs MUST NOT include full tokens, mac values, or registration_blob; at most truncated or hashed values may be used for debugging in non-production builds.

### 10.3 Data Retention

* History retention on-device:
  * The app MAY store a limited history locally (for faster loading) but the authoritative history is on the server.
  * If the user deletes account or signs out with the option to clear local data, the app MUST remove presence history and personal information.

# 11. Network APIs (App-Level)

The mobile app interacts with HNNP Cloud and external org backends via the following categories of APIs. Exact URLs and schemas are defined in system-level API specs; here we define the conceptual behavior.

### 11.1 Authentication and Org APIs

* Login and SSO:
  * Depending on org, the app may:
    * Redirect to web-based auth.
    * Use in-app OAuth flows.
  * After authentication, app receives tokens or session credentials to call:
    * Get profile (name, email).
    * Get org info (org_id, display name, configuration flags).
* Org configuration:
  * Contains flags such as:
    * Whether manual Join session is enabled.
    * Whether push notifications are enabled.
    * Whether multi-device is allowed.

### 11.2 Device Registration APIs

* Register device or fetch device state:
  * App informs backend of this device and receives device_id and any registration status.
  * App can provide registration_blob when external system needs to link user_ref and device_id.
* Deregister or revoke device (if supported).

### 11.3 Presence History APIs

* Fetch history:
  * GET endpoint to retrieve presence events for this user or device within date range, filtered by org and optionally by place.
  * Used by the History tab for server-backed data.

### 11.4 Export and Deletion

* Export history:
  * Endpoint that triggers generation of a downloadable history file or returns it directly.
* Delete account:
  * Endpoint that requests deletion of user-linked data and revocation of all links.

# 12. Security and Privacy Requirements

Beyond HNNP v3 protocol-level security, the mobile app MUST adhere to the following:

* No GPS location usage in the presence verification logic unless separately documented and agreed.
* No personal identifiers in BLE broadcasts.
* No logging of secrets or raw tokens in production builds.
* All network calls over HTTPS, with pinned or strongly validated certificates in sensitive contexts where appropriate.
* Use constant-time comparison where verifying cryptographic data within the app (if any such checks exist; most verification is done in Cloud).

# 13. Error Handling and User Messaging

### 13.1 Types of Errors

* Local configuration issues:
  * Bluetooth off.
  * Permissions denied.
  * Battery saver restricting background.
* Network issues:
  * No internet connection when needing to fetch history or profile.
* Server-side or org-side issues:
  * Presence recording temporarily unavailable.
  * User account disabled or org disabled.

### 13.2 User-facing Messages

* Error messages MUST:
  * Use simple language.
  * Avoid leaking internal implementation details.
  * Provide actionable next steps (e.g., Turn on Bluetooth, Try again later).

### 13.3 Offline Behavior

* When offline:
  * BLE advertising and token rotation MUST continue.
  * History tab uses cached local history if available and clearly indicates it may be partial.
  * Presence tab indicates verification state may be delayed if it depends on Cloud responses for some org-specific features, while still showing local broadcast status.

# 14. Analytics and Telemetry (Optional)

If analytics are used:

* All tracking MUST:
  * Be org-compliant and privacy-compliant.
  * Avoid logging any exact tokens, macs, or cryptographic secrets.
* Example metrics:
  * App version distribution.
  * Frequency of Bluetooth-permission-denied state.
  * Aggregate counts of presence verification successes vs failures (without user identity unless explicitly allowed and documented).

# 15. Versioning and Compatibility

* NearID mobile app versioning:
  * Use semantic versioning (major.minor.patch).
  * Major version increments for breaking UX or protocol changes.
* HNNP protocol support:
  * This spec targets HNNP v3 (version byte 0x02 in tokens).
  * Future protocol versions (e.g., v4) must be explicitly handled and may require updated mobile specs.
* Backward compatibility:
  * App should gracefully handle unknown server-side fields in responses.
  * If server or org requires features unsupported by this client version, app MUST show a clear message instructing user to update the app.

# 16. Conclusion

The NearID mobile app is a thin, user-friendly client built on top of the HNNP Protocol v3. It is responsible for generating and broadcasting anonymous rotating tokens, guiding users through permission setup, presenting real-time presence status, and providing transparent history and privacy controls. It must preserve the cryptographic and privacy guarantees of HNNP at all times, respect the user’s OS theme and accessibility settings, and stay strictly focused on the presence-verification problem without becoming cluttered with admin or developer features.
