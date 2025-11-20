# NearID React Native App

This app demonstrates NearID presence broadcasting with themed screens, onboarding, history, settings, and diagnostics.

## Screens
- **Onboarding**: Welcome, Org email capture, Permissions explainer.
- **Presence**: Header (logo/org/avatar), status pill + animated ring, today stats, recent places, send ping.
- **History**: Sectioned list of presence events with detail view.
- **Settings**: Account, notifications, device status, privacy actions (export/delete), diagnostics entry.
- **Diagnostics**: Bluetooth/permissions/battery/broadcast health checks.

## HNNP + presence flow
- `device_secret` is stored securely via Keychain (`src/storage/deviceSecret.ts`).
- Tokens use HMAC-SHA256 over the current time slot (`src/hnnp/tokenGenerator.ts`) to build a payload `[version, flags, timeSlot, tokenPrefix, mac]`.
- `usePresenceBroadcast` regenerates the payload every 15s and hands it to the BLE advertiser stub (`src/ble/bleAdvertiser.ts`). Replace the stub with platform BLE when wiring real broadcasts.
- UI status (verified/searching/error) reflects device state, permissions, and broadcast health.

## Run the app
1) Prereqs: Node 20+, JDK 17, Android SDK/NDK; (Mac for iOS).  
2) Install deps: `npm install`  
3) Start Metro: `npx react-native start`  
4) Android: `npx react-native run-android` (device/emulator required).  
5) iOS (on Mac): `cd ios && pod install`, then `cd .. && npx react-native run-ios`.

If Gradle warns about deprecated APIs, rerun with `--warning-mode=all` to locate the plugin scripts.

## Navigation & theme
- Bottom tabs are themed (surface background, accent active, muted inactive). StatusBar adjusts for light/dark via the theme.
- History and Settings use nested stacks for detail/diagnostics screens.

## Notes
- `src/api/client.ts` is mocked; replace with real endpoints.
- `src/ble/bleAdvertiser.ts` is a stub; implement native advertising for production.
- Ensure required system permissions (Bluetooth + notifications) on target platforms. 
