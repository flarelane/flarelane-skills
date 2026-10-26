# React Native Integration

Use this file for React Native apps.

Official docs, authoritative when this file is stale or silent: [React Native SDK](https://flarelane.com/ko/docs/sdk-integrations/react-native-sdk), plus the [iOS](https://flarelane.com/ko/docs/sdk-integrations/ios-sdk) and [Android](https://flarelane.com/ko/docs/sdk-integrations/android-sdk) pages for the native layer. English: swap `/ko/` for `/en/`.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- npm package: `@flarelane/react-native-sdk`
- Default export: `import FlareLane from '@flarelane/react-native-sdk';` then call static methods such as `FlareLane.initialize(...)`. It is not a set of named exports.
- Resolve the latest published npm version at integration time before editing `package.json`
- Current deployment-target floor for the native iOS pod: **iOS 15.0+ (FlareLane 1.11.3+)**, and a lower target fails `pod install`. Before pinning, find the project's effective target: the app target's `IPHONEOS_DEPLOYMENT_TARGET` in the Xcode project, and the `platform :ios` line in `ios/Podfile` — which in React Native projects is often `min_ios_version_supported`, a helper whose value depends on the React Native version, so resolve it rather than reading it as a number. Both must clear the floor. The floor moves, so confirm it against the podspec of the version you pin; raise the project only with the user's agreement, or pin the newest release whose minimum it already meets
- If the target repo already pins the package, keep that pin unless the user explicitly asks to upgrade or the needed API is unavailable
- Treat React Native as two layers: JS API calls plus native iOS and Android plumbing

## Public methods used in React Native

- Initialize: `initialize(projectId, requestPermissionOnLaunch)`
- Log level: `setLogLevel(level)`
- Identify user: `setUserId(userId)`
- Set tags: `setTags(tags)`
- Track event: `trackEvent(type, data?)`
- Show in-app: `displayInApp(group, data?)`
- User attributes: `setUserAttributes(attributes)` in SDK `1.10.0+`; on older versions use the [server Track API](server-api.md). Verify against the installed version.
- Permission surface: `isSubscribed(callback)`, `subscribe(fallbackToSettings, callback?)`, and `unsubscribe(callback?)` — these are callback-based and return `void`
- Notification and in-app handlers: `setNotificationClickedHandler(callback)`, `setNotificationForegroundReceivedHandler(callback)` (call `event.display()` on the received event to show it), and `setInAppMessageActionHandler(callback)`
- Device utilities: `getDeviceId()` returns a `Promise<string | null>`
- WebView bridge (hybrid apps): `FlareLaneJavascriptInterface` from `@flarelane/react-native-sdk/adapters/react-native-webview` — inject `FlareLaneJavascriptInterface.injectedJavaScript` into both `injectedJavaScript` and `injectedJavaScriptBeforeContentLoaded`, and wire `onMessage`, so web-page `setUserId`/`setTags`/`trackEvent`/`setUserAttributes` calls propagate to the app

## Common target files in the repo

- `package.json`
- JS entrypoint such as `index.js` or `index.tsx`
- auth, profile, consent, and analytics layers
- `ios/` native project including `AppDelegate`
- `android/` native project including `MainApplication` and `AndroidManifest.xml`

## Timing and location

- `initialize`: JS bootstrap path before `AppRegistry.registerComponent` when feasible, otherwise as early as the root app initialization allows
- `setLogLevel`: before `initialize` when logs need to be forced early
- notification click, foreground, and in-app handlers: register once in the JS bootstrap or root app layer
- `setUserId`: after login success, logout, or account switch
- `setTags`: after profile or preference updates
- `trackEvent`: after a business event is confirmed
- user attributes: `setUserAttributes` on SDK `1.10.0+` after stable profile fields are known; on older versions, or when the backend owns the authoritative data, sync through the [server Track API](server-api.md)
- `displayInApp`: from a real screen open or CTA handler
- `isSubscribed`, `subscribe`, and `unsubscribe`: from onboarding or settings flows that own push preferences
- `getDeviceId`: from support, QA, or explicit copy-ID flows
- native iOS and Android push wiring: in their normal native delegate and application entrypoints

## Required setup shape

1. Install the React Native package.
2. Initialize from the JS entrypoint.
3. If the product customizes click, foreground, or in-app behavior, register the handlers once in the JS root layer.
4. If the product owns notification preferences, wire `isSubscribed`, `subscribe`, and `unsubscribe`.
5. If supported profile fields are required, call `setUserAttributes(attributes)` when the installed SDK is `1.10.0+`; otherwise sync through the [server Track API](server-api.md).
6. Wire JS calls for `setUserId`, `setTags`, `trackEvent`, and `displayInApp`.
7. Complete the native baseline. This is mandatory, not a follow-up phase: JS `initialize` alone compiles and may register a device while delivery, foreground handling, and image notifications stay silently broken. See "Delivery baseline" in [shared-surface](shared-surface.md).
   - iOS — the full list in [ios](ios.md) applies to `ios/`, including the parts a JS-only mindset skips:
     1. Push Notifications capability.
     2. Background Modes with Remote notifications.
     3. A Notification Service Extension target (suggested name `FlareLaneNotificationServiceExtension`), scheme not activated, Minimum Deployments matching the app target — both at **iOS 15.0+ (FlareLane 1.11.3+)**.
     4. App Group `group.<bundleID>.flarelane` added and enabled on **both** the app target and the extension.
     5. A `target '<ExtensionName>' do pod 'FlareLane', '<version>' end` block at the bottom of `ios/Podfile`, then `pod install`. `<version>` must be exactly the native FlareLane version the installed RN package pins (its podspec, or `ios/Podfile.lock` after a first `pod install`), not the latest native release: one Podfile cannot resolve two versions of the same pod, so a mismatch fails `pod install`. The RN main target gets FlareLane through autolinking, so this extension block is the piece that is easy to forget.
     6. In `AppDelegate`: forward `didRegisterForRemoteNotificationsWithDeviceToken` to `FlareLaneAppDelegate.shared`, and forward the `UNUserNotificationCenter` `willPresent` / `didReceive` methods to `FlareLaneNotificationCenter.shared`. RN does **not** call `initWithLaunchOptions` natively — JS `initialize` owns that.
     7. In the extension, forward `didReceive` and `serviceExtensionTimeWillExpire` to `FlareLaneNotificationServiceExtensionHelper.shared`, branching on `isFlareLaneNotification` (code sample in [ios](ios.md)).
   - Android: confirm an `Application` class initializes the SDK (autolinking covers the dependency), and set `compileSdkVersion`/`targetSdkVersion` to **33 or higher** in `android/app/build.gradle` so the Android 13 notification permission prompt can appear at all.
8. Keep existing native modules and notification code intact.
9. Surface the console-side prerequisites the user must confirm: APNs `.p8` key, Key ID, and Team ID for iOS; FCM V1 enabled with a service-account key for Android. Neither is visible from the repo, and without them every send fails.

## Recommended additions

Wire these on every RN integration without asking first (see "Recommended surface" in [shared-surface](shared-surface.md)): `setLogLevel` in dev builds; a debug path that surfaces `getDeviceId()` for test-device registration; `isSubscribed`/`subscribe`/`unsubscribe` on an existing settings screen; one real `displayInApp` trigger; all supported user attributes the app holds; the `FlareLaneJavascriptInterface` WebView bridge if any screen renders product web pages; and, on the Android side, `flarelane_notification_accent_color` taken from the app's existing brand color. The Android notification icon needs an alpha-only silhouette asset — reuse one the repo already has, otherwise hand it off as a one-line request (see "Recommended additions" in [android](android.md)).

## Questions that actually matter

Determine these — by inference from the repo wherever possible, and by listing the leftovers in one batch at the end. They are inputs to resolve, not a questionnaire to send first.

- Is this a bare React Native app or Expo-managed?
- Should permission be requested at launch or later?
- Does the app need custom click, foreground, or in-app action handling?
- Which auth flow should set and clear `setUserId`?
- Which tags and events matter in production?
- Which profile fields should be synced through the server Track API as user attributes?
- Which screen or action should own `displayInApp`?
- Does any support or QA flow need the device ID?

## Terms

- Bare React Native: the repo contains editable native `ios/` and `android/` projects
- Expo-managed: native projects may be hidden until prebuild

## Caution points

- Do not stop after adding JS calls if native notification plumbing is absent. A JS-only diff is the most common way an RN integration ships half-done: it builds, the device registers, and image push plus click tracking never work.
- Creating the iOS extension target needs Xcode. Do the file-editable parts (`Podfile`, `AppDelegate`, entitlements, `Info.plist`), then hand the target creation back as an explicit ordered checklist with exact names — see "Doing Xcode work without Xcode" in [ios](ios.md).
- Prefer the repo's real entrypoint over a demo component for initialization.
- If the app is Expo-managed and native folders are missing, confirm whether generating native projects is acceptable before promising native changes. This native SDK does not run in Expo Go — it requires prebuild plus a custom dev/EAS build (and push entitlements via a config plugin or `app.json`). Adding the package to a managed app without a dev build leaves push silently dead.
- Do not register handlers inside a screen component that can remount often.
- Avoid duplicating initialization in hot-reload-only code paths.
- To take over click routing, there is no JS flag: set the native `flarelane_dismiss_launch_url` flag (Android manifest meta-data, iOS `Info.plist`) or per-message `data`, then handle the URL in `setNotificationClickedHandler`.

## Verification

- App boots without native module errors.
- Initialization occurs once.
- Native iOS and Android projects still build.
- iOS: capability, Background Modes, extension target, and an enabled `group.<bundleID>.flarelane` on both targets are all in place, or listed as pending manual steps.
- Android: `compileSdkVersion`/`targetSdkVersion` are 33+ and the permission prompt appears on an Android 13+ device.
- A real send arrives on both platforms, and an image send renders its image on iOS.
- User ID, tags, events, and in-app display work from real product flows.
- Subscribe or unsubscribe flows work if the app owns notification settings.
- Click, foreground, and in-app action handlers run only when they were registered.
