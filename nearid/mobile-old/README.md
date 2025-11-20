# NearID React Native App

The NearID React Native (TypeScript) app lives in `NearID/` under this folder. All app code and configuration stay within `hnnp/mobile`.

## Requirements
- Node.js 18+ and npm (ships with Node)
- Android Studio + SDK/Emulator and Java 17 for Android builds
- macOS with Xcode and CocoaPods for iOS builds (use the included Gemfile)
- Watchman (optional, recommended on macOS)

## Install dependencies
```bash
cd hnnp/mobile/NearID
npm install
```

## Run the Android app
- Start Metro in one terminal: `npm start`
- With an emulator running or device attached, run in another terminal: `npx react-native run-android`

## Run the iOS app
- On macOS, from `hnnp/mobile/NearID`:
  1) Install pods: `cd ios && bundle install && bundle exec pod install && cd ..`
  2) Start Metro: `npm start`
  3) In a new terminal: `npx react-native run-ios` (or open `ios/NearID.xcworkspace` in Xcode and run)

> If building iOS from non-macOS environments, use a macOS runner (CI, EAS, or remote Mac) to complete the CocoaPods/Xcode steps above.
