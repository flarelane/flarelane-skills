# iOS Integration

Use this file for native iOS integrations.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- Two supported install paths; match whichever the target repo already uses:
  - CocoaPods: package `FlareLane` (`pod 'FlareLane'`).
  - Swift Package Manager: `https://github.com/flarelane/FlareLane-iOS-SDK`, product `FlareLane` for the main target and product `FlareLaneExtension` for a Notification Service Extension target.
- Resolve the latest published version at integration time before editing `Podfile` or `Package.swift`
- If the target repo already pins `FlareLane` or already has a `Podfile.lock`/`Package.resolved`, keep that resolved version unless the user explicitly asks to upgrade or the needed API is unavailable
- If the app uses a Notification Service Extension, add FlareLane to both the main target and the extension target (CocoaPods: `pod 'FlareLane'` in the extension target too; SPM: the `FlareLaneExtension` product)

## Public methods used on iOS

- Initialize: `initWithLaunchOptions(launchOptions, projectId, requestPermissionOnLaunch)`
- Log level: `setLogLevel(level:)`
- Identify user: `setUserId(userId:)`
- Set tags: `setTags(tags:)`
- Track event: `trackEvent(type, data:)`
- Show in-app: `displayInApp(group:, data:)`
- User attributes: `setUserAttributes(attributes:)` in SDK `1.10.0+`; on older versions use the [server Track API](server-api.md). Verify against the installed version.
- Permission surface: `isSubscribed(completion)`, `subscribe(fallbackToSettings, completion)`, and `unsubscribe(completion)`
- Notification and in-app handlers: `setNotificationClickedHandler(callback)`, `setNotificationForegroundReceivedHandler(callback)`, and `setInAppMessageActionHandler(callback)`
- Device utilities: `getDeviceId()`
- Rare utility surface from the SDK code: `resetDevice()`

Supporting delegate forwarding:

- `didRegisterForRemoteNotificationsWithDeviceToken`
- `UNUserNotificationCenter` foreground and response delegates

## Common target files in the repo

- `Podfile`
- UIKit `AppDelegate` or SwiftUI app entrypoint plus `UIApplicationDelegateAdaptor`
- app entitlements and capabilities
- notification extension target, if present
- auth, profile, consent, and event instrumentation code

## Timing and location

- `initWithLaunchOptions`: `application(_:didFinishLaunchingWithOptions:)`
- `setLogLevel`: before or adjacent to `initWithLaunchOptions` when log verbosity matters
- notification click, foreground, and in-app handlers: register during bootstrap before the app starts reacting to push opens or foreground deliveries
- device token forwarding: `didRegisterForRemoteNotificationsWithDeviceToken`
- notification delegate forwarding: `UNUserNotificationCenterDelegate`
- `setUserId`: after login success, logout, or account switch
- `setTags`: after stable profile or preference updates
- `trackEvent`: after a business event is confirmed
- user attributes: sync through the [server Track API](server-api.md) after the backend has stable profile fields
- `displayInApp`: from a real screen lifecycle such as `viewDidAppear`, SwiftUI `onAppear`, or a CTA handler, while guarding against repeated spam
- `isSubscribed`, `subscribe`, and `unsubscribe`: from an onboarding CTA or settings screen that owns notification preferences
- `getDeviceId`: from support, QA, or explicit copy-ID flows
- `resetDevice`: only from a deliberate hard-reset or environment-reset flow

## Required setup shape

1. Add Push Notifications capability.
2. Add Background Modes with Remote notifications.
3. If rich media is required, create or reuse a Notification Service Extension. FlareLane ships a ready-made base class `FlareLaneNotificationServiceExtension` (subclass it), or forward to `FlareLaneNotificationServiceExtensionHelper.shared` from a custom `UNNotificationServiceExtension` in both `didReceive(_:withContentHandler:)` and `serviceExtensionTimeWillExpire()`.
4. Create and enable an App Group on both the main app and the extension, named `group.<bundleID>.flarelane` where `<bundleID>` is the app's Bundle Identifier.
5. Add FlareLane to the relevant targets (CocoaPods `Podfile` or SPM products).
6. Initialize in `application(_:didFinishLaunchingWithOptions:)`.
7. Forward token and notification delegate callbacks (`FlareLaneAppDelegate.shared` for the device token; `FlareLaneNotificationCenter.shared` for the notification-center delegate methods).
8. If the product customizes click, foreground, or in-app behavior, register the handlers during bootstrap.
9. If the product owns notification preferences, wire `isSubscribed`, `subscribe`, and `unsubscribe`.
10. If supported profile fields are required, call `setUserAttributes(attributes:)` when the installed SDK is `1.10.0+`; otherwise sync through the [server Track API](server-api.md).
11. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from app logic.

## Disabling automatic click-URL opening

By default FlareLane opens the notification's landing URL or deep link automatically on click (`http`/`https` open in an in-app Safari view; custom schemes route as a deep link). Only disable this when the app must own click routing. The click still reaches `setNotificationClickedHandler`, so register a handler to route the URL yourself.

- App-wide: add a boolean key `flarelane_dismiss_launch_url` set to `YES` in `Info.plist`.
- Per-notification: include `"flarelane_dismiss_launch_url": "true"` in the send `data` payload.
- There is no Swift API to toggle this; use the `Info.plist` key or the per-message `data` key. Requires SDK `1.6.0+`.

## Questions that actually matter

- Should permission be requested on launch or later?
- Do you need rich media notifications now, or only basic push?
- What is the extension target name if it already exists?
- What App Group should be reused if one already exists?
- Which auth lifecycle and product events should map to FlareLane calls?
- Which profile fields should be synced through the server Track API as user attributes?
- Does the app need custom click, foreground, or in-app action handling?
- Does any support or QA flow need the device ID?

## Terms

- Notification Service Extension: a small helper target that can modify incoming notifications, commonly used for media attachments
- App Group: shared storage between the app and the extension
- SwiftUI AppDelegate adaptor: the bridge that lets a SwiftUI app still use `AppDelegate` lifecycle methods

## Caution points

- Do not create a second push stack when one already exists. Merge into the current delegate flow.
- If the app is SwiftUI-only, add the minimal `AppDelegate` bridge instead of forcing a full lifecycle rewrite.
- Keep the extension deployment target aligned with the main target.
- Do not register handlers from a frequently recreated SwiftUI view.
- Avoid calling `displayInApp()` from highly repetitive lifecycle points without a product-level guard.

## Verification

- App builds after `pod install`.
- Device token forwarding still works.
- Foreground and click delegate paths still work.
- Device registration, user ID, tags, and events update correctly.
- `displayInApp()` is reachable from the intended screen or action.
- `isSubscribed`, `subscribe`, and `unsubscribe` work if the app owns notification preferences.
- In-app action handlers fire only if the app registered them.
