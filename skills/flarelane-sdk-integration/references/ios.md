# iOS Integration

Use this file for native iOS integrations.

Official docs, authoritative when this file is stale or silent: [iOS SDK](https://flarelane.com/ko/docs/sdk-integrations/ios-sdk), [APNs credentials](https://flarelane.com/ko/docs/sdk-integrations/apns-setting), [Mobile SDK reference](https://flarelane.com/ko/docs/mobile-sdk-reference). English: swap `/ko/` for `/en/`.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## iOS is never "just add the SDK"

An iOS integration is only finished when the Xcode project itself is set up: capabilities, a Notification Service Extension, and an App Group. Adding the pod and calling `initWithLaunchOptions` compiles and can even register a device, so the work *looks* done — while image notifications never render and delivery/foreground behavior stays broken. The minimal-diff principle does not apply here; see "Delivery baseline" in [shared-surface](shared-surface.md).

Most of this lives in `project.pbxproj` and entitlements, not in Swift. Plan for project-level work from the start, and read "Doing Xcode work without Xcode" below before deciding what to hand back to the user.

## Install contract

- Two supported install paths; match whichever the target repo already uses:
  - CocoaPods: package `FlareLane` (`pod 'FlareLane'`).
  - Swift Package Manager: `https://github.com/flarelane/FlareLane-iOS-SDK`, product `FlareLane` for the main target and product `FlareLaneExtension` for a Notification Service Extension target.
- Resolve the latest published version at integration time before editing `Podfile` or `Package.swift`
- Current deployment-target floor: **iOS 15.0+ (FlareLane 1.11.3+)**, raised from 12.0, and it applies to the app and the extension target alike. The floor moves, so confirm it against the podspec or `Package.swift` of the version you actually pin rather than trusting this line. If the project targets lower, do not raise the customer's floor silently: get their agreement, or pin the newest FlareLane release whose minimum the project already meets
- If the target repo already pins `FlareLane` or already has a `Podfile.lock`/`Package.resolved`, keep that resolved version unless the user explicitly asks to upgrade or the needed API is unavailable
- CocoaPods requires dynamic frameworks: `use_frameworks!` must be at the top of the `Podfile`. If it is absent, add it — and if the repo deliberately builds static (`use_frameworks! :linkage => :static`, `use_modular_headers!`, or another pod that requires static linking), raise the conflict with the user instead of flipping it silently.
- Add FlareLane to **both** the main target and the extension target — CocoaPods needs its own `target '<ExtensionName>' do pod 'FlareLane', '<version>' end` block at the bottom of the `Podfile`; SPM needs product `FlareLane` on the app target and `FlareLaneExtension` on the extension target.
- Run `pod install` after editing the `Podfile`, and expect the extension target to exist first — a `Podfile` block for a target that Xcode has not created yet fails.

```ruby
# Podfile
use_frameworks!

target 'YourApp' do
  pod 'FlareLane', '<resolved-version>'
end

target 'FlareLaneNotificationServiceExtension' do
  pod 'FlareLane', '<resolved-version>'
end
```

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
- user attributes: `setUserAttributes` on SDK `1.10.0+` after stable profile fields are known; on older versions, or when the backend owns the authoritative data, sync through the [server Track API](server-api.md)
- `displayInApp`: from a real screen lifecycle such as `viewDidAppear`, SwiftUI `onAppear`, or a CTA handler, while guarding against repeated spam
- `isSubscribed`, `subscribe`, and `unsubscribe`: from an onboarding CTA or settings screen that owns notification preferences
- `getDeviceId`: from support, QA, or explicit copy-ID flows
- `resetDevice`: only from a deliberate hard-reset or environment-reset flow

## Required setup shape

Steps 1–7 are the mandatory baseline. None of them is conditional on the request; a "basic push only" integration still needs all seven.

1. **Push Notifications capability** on the main app target.
2. **Background Modes → Remote notifications** on the main app target.
3. **Notification Service Extension target.** Create it (or reuse an existing one) — do not treat it as a rich-media-only extra: without it, image notifications never render, and the official setup flow includes it in every iOS integration. Suggested product name `FlareLaneNotificationServiceExtension`; do not activate its scheme; set its **Minimum Deployments to the main app target's** deployment target, with both at **iOS 15.0+ (FlareLane 1.11.3+)**.
4. **App Group `group.<bundleID>.flarelane`**, where `<bundleID>` is the main app's Bundle Identifier, added *and* toggled on for **both** the main app target and the extension target. Added but unchecked behaves exactly like missing.
5. **FlareLane on both targets** (`Podfile` blocks or SPM `FlareLane` + `FlareLaneExtension`), then `pod install`.
6. **Initialize** with `initWithLaunchOptions` in `application(_:didFinishLaunchingWithOptions:)`, and on SwiftUI-only apps add the small `AppDelegate` + `@UIApplicationDelegateAdaptor` bridge first.
7. **Forward the callbacks**: device token to `FlareLaneAppDelegate.shared`, and the `UNUserNotificationCenter` `willPresent` / `didReceive` methods to `FlareLaneNotificationCenter.shared`. Implement the extension's `didReceive(_:withContentHandler:)` and `serviceExtensionTimeWillExpire()` (see below).
8. If the product customizes click, foreground, or in-app behavior, register the handlers during bootstrap.
9. If the product owns notification preferences, wire `isSubscribed`, `subscribe`, and `unsubscribe`.
10. If supported profile fields are required, call `setUserAttributes(attributes:)` when the installed SDK is `1.10.0+`; otherwise sync through the [server Track API](server-api.md).
11. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from app logic.

Before this can deliver anything, the user must also have APNs credentials in the FlareLane Console: the App Identifier registered in Apple Developer, plus the `.p8` key, Key ID, and Team ID entered in the console's app-push channel settings. Surface it as a confirmation item — code alone cannot make a send succeed.

## Notification Service Extension code

Either subclass FlareLane's ready-made `FlareLaneNotificationServiceExtension` base class, or keep Xcode's generated `UNNotificationServiceExtension` subclass and forward to the helper. Forward from both methods, and branch on `isFlareLaneNotification` so a customer's own (or another SDK's) notifications keep their existing handling:

```swift
import UserNotifications
import FlareLane

class NotificationService: UNNotificationServiceExtension {
  override func didReceive(_ request: UNNotificationRequest,
                           withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    if FlareLaneNotificationServiceExtensionHelper.shared.isFlareLaneNotification(request) {
      FlareLaneNotificationServiceExtensionHelper.shared.didReceive(request, withContentHandler: contentHandler)
    } else {
      // existing non-FlareLane handling, or contentHandler(request.content)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    FlareLaneNotificationServiceExtensionHelper.shared.serviceExtensionTimeWillExpire()
  }
}
```

When the app already has a Notification Service Extension for another push vendor, extend that extension with this branch instead of creating a second one — an app gets one NSE, and a second target does not run.

## Doing Xcode work without Xcode

The baseline lives in project files, so decide per step whether to edit it or hand it over. Never let "I cannot click in Xcode" turn into silently skipping a step.

Editable from the filesystem:

- Background Modes: `UIBackgroundModes` containing `remote-notification` in the target's `Info.plist`. If the target generates its plist (`GENERATE_INFOPLIST_FILE = YES` and no `Info.plist` in the repo), do this one in Xcode and verify the key afterwards rather than hand-rolling build settings.
- App Group and push entitlement: `com.apple.security.application-groups` with `group.<bundleID>.flarelane`, and `aps-environment` (`development`), in each target's `.entitlements` file. Every target needs its own entitlements file, referenced by `CODE_SIGN_ENTITLEMENTS` in `project.pbxproj`.
- `Podfile`, `Package.swift`, `AppDelegate`, and the extension's Swift source.

Hand back to the user, with exact values spelled out:

- Creating the Notification Service Extension target. Hand-editing `project.pbxproj` to add a target is error-prone and can corrupt the project — prefer **File > New > Target > Notification Service Extension**, product name, cancel the scheme prompt, then match Minimum Deployments.
- Enabling the capability in the Apple Developer App ID, and regenerating provisioning profiles when signing is manual or CI-managed. Entitlements written by hand without a matching profile fail at signing, not at build.

Then report status as "code complete, N manual steps pending" with the checklist, and say which verification steps only pass once those are done.

## Recommended additions

Beyond the baseline, wire these on every iOS integration without asking first — see "Recommended surface" in [shared-surface](shared-surface.md):

- `setLogLevel` in debug builds only.
- A debug-only path that surfaces `getDeviceId()`, so the team can register a test device and use console test sends.
- `isSubscribed` / `subscribe` / `unsubscribe` on an existing notification settings screen, especially when `requestPermissionOnLaunch` is `false`.
- `displayInApp` from one real screen or CTA, so the in-app message channel is usable from day one.
- `setUserAttributes` for every supported profile field the app holds when the installed SDK is `1.10.0+`, or the [server Track API](server-api.md) when the backend owns them.
- `FlareLaneJavascriptInterface` on any `WKWebView` that renders product pages, so web-side identity and events reach the device.

## Disabling automatic click-URL opening

By default FlareLane opens the notification's landing URL or deep link automatically on click (`http`/`https` open in an in-app Safari view; custom schemes route as a deep link). Only disable this when the app must own click routing. The click still reaches `setNotificationClickedHandler`, so register a handler to route the URL yourself.

- App-wide: add a boolean key `flarelane_dismiss_launch_url` set to `YES` in `Info.plist`.
- Per-notification: include `"flarelane_dismiss_launch_url": "true"` in the send `data` payload.
- There is no Swift API to toggle this; use the `Info.plist` key or the per-message `data` key. Requires SDK `1.6.0+`.

## Questions that actually matter

Determine these — by inference from the repo wherever possible, and by listing the leftovers in one batch at the end. They are inputs to resolve, not a questionnaire to send first.

- Should permission be requested on launch or later?
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

- Do not stop at the Swift diff. An iOS integration without the capability, Background Modes, extension target, and enabled App Group is unfinished, no matter how clean the code looks.
- Do not silently downgrade a baseline step to a suggestion. If a step needs Xcode, say so as a pending action item, with the exact target type, product name, App Group id, and deployment target to use.
- Do not create a second push stack when one already exists. If a `UNUserNotificationCenterDelegate` is already set, keep it as the delegate and add `FlareLaneNotificationCenter.shared` forwarding calls inside its existing `willPresent`/`didReceive` methods — never reassign `UNUserNotificationCenter.current().delegate`, which would silently kill the app's own deep-link, badge, and other push-SDK handling.
- The SDK swizzles UIApplication/notification delegate methods by default; if the app disables swizzling or uses Firebase or another SDK that swizzles, verify the two coexist and forward correctly.
- If the app uses per-scheme or per-configuration bundle IDs (for example `com.acme.app.dev`, `.staging`), add a matching `group.<bundleID>.flarelane` App Group for each bundle ID on both the main app and the extension; a single hard-coded group silently fails to share data in the non-matching build. Expect provisioning profiles to need regeneration, which can affect manual signing or CI.
- If the app is SwiftUI-only, add the minimal `AppDelegate` bridge instead of forcing a full lifecycle rewrite.
- Keep the extension deployment target aligned with the main target.
- Do not register handlers from a frequently recreated SwiftUI view.
- Avoid calling `displayInApp()` from highly repetitive lifecycle points without a product-level guard.

## Verification

- The main target has Push Notifications and Background Modes with Remote notifications.
- The Notification Service Extension target exists, builds, links FlareLane, and matches the app's deployment target.
- `group.<bundleID>.flarelane` is present **and checked** on both the main app and the extension, and matches the actual bundle identifier of the build being tested.
- App builds after `pod install`.
- A real send arrives on a device, and an **image** send renders its image — the only reliable proof the extension and App Group are wired.
- Device token forwarding still works.
- Foreground and click delegate paths still work.
- Device registration, user ID, tags, and events update correctly.
- `displayInApp()` is reachable from the intended screen or action.
- `isSubscribed`, `subscribe`, and `unsubscribe` work if the app owns notification preferences.
- In-app action handlers fire only if the app registered them.
