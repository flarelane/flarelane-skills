# Flutter Integration

Use this file for Flutter apps.

Official docs, authoritative when this file is stale or silent: [Flutter SDK](https://flarelane.com/ko/docs/sdk-integrations/flutter-sdk), plus the [iOS](https://flarelane.com/ko/docs/sdk-integrations/ios-sdk) and [Android](https://flarelane.com/ko/docs/sdk-integrations/android-sdk) pages for the native layer. English: swap `/ko/` for `/en/`.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- pub.dev package: `flarelane_flutter`
- Resolve the latest published pub.dev version at integration time before editing `pubspec.yaml`
- Current deployment-target floor for the native iOS pod: **iOS 15.0+ (FlareLane 1.11.3+)**, and a lower target fails `pod install`. Before pinning, find the project's effective target: the app target's `IPHONEOS_DEPLOYMENT_TARGET` in the Xcode project, and the `platform :ios` line in `ios/Podfile` — which Flutter templates ship commented out, in which case CocoaPods falls back to the project's target, so set it explicitly. Both must clear the floor. The floor moves, so confirm it against the podspec of the version you pin; raise the project only with the user's agreement, or pin the newest release whose minimum it already meets
- If the target repo already pins the package, keep that pin unless the user explicitly asks to upgrade or the needed API is unavailable
- Treat Flutter as two layers: Dart API calls plus native iOS and Android setup behind the plugin

## Public methods used in Flutter

- Initialize: `FlareLane.shared.initialize(projectId, requestPermissionOnLaunch: ...)`
- Log level: `FlareLane.shared.setLogLevel(level)`
- Identify user: `FlareLane.shared.setUserId(userId)`
- Set tags: `FlareLane.shared.setTags(tags)`
- Track event: `FlareLane.shared.trackEvent(type, data?)`
- Show in-app: `FlareLane.shared.displayInApp(group, [data])`
- User attributes: `FlareLane.shared.setUserAttributes(Map<String, Object?> attributes)` in SDK `1.10.0+`; on older versions use the [server Track API](server-api.md). Verify against the installed version.
- Permission surface: `FlareLane.shared.isSubscribed()`, `FlareLane.shared.subscribe([fallbackToSettings, callback])`, and `FlareLane.shared.unsubscribe([callback])`
- Notification and in-app handlers: `FlareLane.shared.setNotificationClickedHandler(handler)`, `FlareLane.shared.setNotificationForegroundReceivedHandler(handler)` (call `event.display()` to show it), and `FlareLane.shared.setInAppMessageActionHandler(handler)`
- Device utilities: `FlareLane.shared.getDeviceId()`
- WebView bridge (hybrid apps): `FlareLaneJavascriptInterface` adapters for `webview_flutter` or `flutter_inappwebview`, so web-page `setUserId`/`setTags`/`trackEvent`/`setUserAttributes` calls propagate to the app
- Note on arguments: only `initialize`'s `requestPermissionOnLaunch` is a named parameter; the trailing arguments on `trackEvent`, `displayInApp`, `subscribe`, and `unsubscribe` are optional positional parameters

## Common target files in the repo

- `pubspec.yaml`
- `lib/main.dart` or other startup orchestration
- auth, profile, consent, and analytics layers
- `ios/Runner/AppDelegate.*`
- `android/app/src/main/AndroidManifest.xml`
- existing push or Firebase plugins

## Timing and location

- `initialize`: after `WidgetsFlutterBinding.ensureInitialized()`, before the app depends on FlareLane state
- `setLogLevel`: before `initialize` when logging needs to be forced early
- notification click, foreground, and in-app handlers: register once from the app bootstrap or root state layer
- `setUserId`: after login success, logout, or account switch
- `setTags`: after profile or preference updates
- `trackEvent`: after a business event is confirmed
- user attributes: `setUserAttributes` on SDK `1.10.0+` after stable profile fields are known; on older versions, or when the backend owns the authoritative data, sync through the [server Track API](server-api.md)
- `displayInApp`: from a real route open or CTA handler
- `isSubscribed`, `subscribe`, and `unsubscribe`: from onboarding or settings flows that own push preferences
- `getDeviceId`: from support, QA, or explicit copy-ID flows
- native iOS and Android push wiring: in the normal platform entrypoints when the plugin requires it

## Required setup shape

1. Add the dependency in `pubspec.yaml`.
2. Call `WidgetsFlutterBinding.ensureInitialized()` before FlareLane initialization.
3. Initialize via `FlareLane.shared.initialize(...)`.
4. If the product customizes click, foreground, or in-app behavior, register the handlers once in the root layer.
5. If the product owns notification preferences, wire `isSubscribed`, `subscribe`, and `unsubscribe`.
6. If supported profile fields are required, call `FlareLane.shared.setUserAttributes(...)` when the installed SDK is `1.10.0+`; otherwise sync through the [server Track API](server-api.md).
7. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from Dart app flows.
8. Complete the native baseline. The Dart API alone does not deliver push, and this step is mandatory rather than a later phase — see "Delivery baseline" in [shared-surface](shared-surface.md).
   - iOS — the full list in [ios](ios.md) applies to `ios/`:
     1. Push Notifications capability on `Runner`.
     2. Background Modes with Remote notifications.
     3. A Notification Service Extension target (suggested name `FlareLaneNotificationServiceExtension`), scheme not activated, Minimum Deployments matching `Runner` — both at **iOS 15.0+ (FlareLane 1.11.3+)**.
     4. App Group `group.<bundleID>.flarelane` added and enabled on **both** `Runner` and the extension.
     5. A `target '<ExtensionName>' do pod 'FlareLane', '<version>' end` block at the bottom of `ios/Podfile`, then `pod install`. `<version>` must be exactly the native FlareLane version the installed plugin pins (its podspec, or `ios/Podfile.lock` after a first `pod install`), not the latest native release: one Podfile cannot resolve two versions of the same pod, so a mismatch fails `pod install`. The plugin brings FlareLane to `Runner` itself, so the extension block is the piece that gets missed.
     6. In `ios/Runner/AppDelegate.swift` (a `FlutterAppDelegate` subclass): `override` `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` and forward to `FlareLaneAppDelegate.shared`, set `UNUserNotificationCenter.current().delegate`, and forward the `willPresent` / `didReceive` methods to `FlareLaneNotificationCenter.shared`. Dart `initialize` owns initialization — do not also call `initWithLaunchOptions` natively.
     7. In the extension, forward `didReceive` and `serviceExtensionTimeWillExpire` to `FlareLaneNotificationServiceExtensionHelper.shared`, branching on `isFlareLaneNotification` (code sample in [ios](ios.md)).
   - Android: set `compileSdkVersion`/`targetSdkVersion` to **33 or higher** in `android/app/build.gradle` so the Android 13 permission prompt can appear, and confirm the manifest and any existing FCM service still coexist.
   - Verify a real push is delivered, not just that the app compiles.
9. Surface the console-side prerequisites the user must confirm: APNs `.p8` key, Key ID, and Team ID for iOS; FCM V1 enabled with a service-account key for Android.

## Recommended additions

Wire these on every Flutter integration without asking first (see "Recommended surface" in [shared-surface](shared-surface.md)): `setLogLevel` in debug builds; a debug path that surfaces `getDeviceId()` for test-device registration; `isSubscribed`/`subscribe`/`unsubscribe` on an existing settings route; one real `displayInApp` trigger; all supported user attributes the app holds; the `FlareLaneJavascriptInterface` bridge for `webview_flutter` or `flutter_inappwebview` screens that render product web pages; and, on the Android side, `flarelane_notification_accent_color` taken from the app's existing brand color. The Android notification icon needs an alpha-only silhouette asset — reuse one the repo already has, otherwise hand it off as a one-line request (see "Recommended additions" in [android](android.md)).

## Questions that actually matter

Determine these — by inference from the repo wherever possible, and by listing the leftovers in one batch at the end. They are inputs to resolve, not a questionnaire to send first.

- Should permission be requested at launch or later?
- Which auth lifecycle should call `setUserId`?
- Which profile or device fields should become tags?
- Which product events should call `trackEvent`?
- Which profile fields should be synced through the server Track API as user attributes?
- Which screen or CTA should call `displayInApp`?
- Does the app need custom click, foreground, or in-app action handling?
- Does any support or QA flow need the device ID?

## Terms

- MethodChannel: the Flutter bridge that lets Dart call native iOS and Android code
- `ensureInitialized()`: Flutter bootstrap call required before plugins can safely initialize

## Caution points

- The Dart API is only half the integration. A Dart-only diff builds, registers a device, and leaves image push and click tracking dead.
- Creating the iOS extension target needs Xcode. Do the file-editable parts (`Podfile`, `AppDelegate`, entitlements, `Info.plist`), then hand target creation back as an explicit ordered checklist with exact names — see "Doing Xcode work without Xcode" in [ios](ios.md).
- Preserve existing notification plugins and reconcile them carefully.
- If the app already has an AppDelegate or native notification handlers, merge rather than replace.
- Do not register handlers from widgets that rebuild frequently.
- Avoid running initialization from widget rebuild paths.
- To take over click routing, there is no Dart flag: set the native `flarelane_dismiss_launch_url` flag (Android manifest meta-data, iOS `Info.plist`) or per-message `data`, then handle the URL in `FlareLane.shared.setNotificationClickedHandler`.

## Verification

- Flutter app boots without plugin initialization errors.
- Device registration succeeds.
- Native iOS and Android projects still compile.
- iOS: capability, Background Modes, extension target, and an enabled `group.<bundleID>.flarelane` on both targets are all in place, or listed as pending manual steps.
- Android: `compileSdkVersion`/`targetSdkVersion` are 33+ and the permission prompt appears on an Android 13+ device.
- A real send arrives on both platforms, and an image send renders its image on iOS.
- User ID, tags, events, and in-app display work from real product flows.
- Subscribe or unsubscribe flows work if the app owns notification settings.
- Click, foreground, and in-app action handlers run only when they were registered.
