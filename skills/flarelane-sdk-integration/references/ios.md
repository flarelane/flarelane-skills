# iOS Integration

Use this file for native iOS integrations.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- CocoaPods package: `FlareLane`
- Resolve the latest published CocoaPods version at integration time before editing `Podfile`
- If the target repo already pins `FlareLane` or already has a `Podfile.lock`, keep that resolved version unless the user explicitly asks to upgrade or the needed API is unavailable
- If the app uses a Notification Service Extension, add `FlareLane` to both the main target and the extension target

## Public methods used on iOS

- Initialize: `initWithLaunchOptions(launchOptions, projectId, requestPermissionOnLaunch)`
- Log level: `setLogLevel(level:)`
- Identify user: `setUserId(userId:)`
- Set tags: `setTags(tags:)`
- Track event: `trackEvent(type, data:)`
- Show in-app: `displayInApp(group:, data:)`
- User attributes: no public iOS SDK method; use the [server Track API](server-api.md)
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
3. If rich media is required, create or reuse a Notification Service Extension.
4. Create and enable an App Group for both the main app and the extension when needed.
5. Add `FlareLane` to the relevant targets in `Podfile`.
6. Initialize in `application(_:didFinishLaunchingWithOptions:)`.
7. Forward token and notification delegate callbacks.
8. If the product customizes click, foreground, or in-app behavior, register the handlers during bootstrap.
9. If the product owns notification preferences, wire `isSubscribed`, `subscribe`, and `unsubscribe`.
10. If supported profile fields are required, add [server Track API](server-api.md) sync rather than a non-existent iOS `setUserAttributes` call.
11. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from app logic.

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
