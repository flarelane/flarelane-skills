# Shared Surface

Read this file first, then read exactly one platform file or [server-api](server-api.md).

For `setUserId`, tags, events, user attributes, segmentation, personalization, or automation data, also read [data-modeling](data-modeling.md).

Before editing install files or wiring SDK calls, run the best-effort freshness check in [staying-current](staying-current.md) so the skill and the pinned SDK versions stay up to date.

## Deployment model

This skill must remain usable after publication without access to this workspace's SDK source code.

- Trust the target repo first.
- Trust the public SDK and server API contracts in this skill second.
- Use package registry metadata only to resolve the latest published SDK version at integration time.
- Do not depend on official-doc URLs to start or finish the work.
- On web, prefer the CDN script tag plus root `sw.js`.
- For server APIs, keep the project token in backend secrets only and do not add it to client or mobile code.

## Public method contract

| Goal          | Web                                             | Android                                                          | iOS                                                                          | React Native                                       | Flutter                                                 |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Initialize    | `initialize({ projectId, serviceWorkerPath? })` | `initWithContext(context, projectId, requestPermissionOnLaunch)` | `initWithLaunchOptions(launchOptions, projectId, requestPermissionOnLaunch)` | `initialize(projectId, requestPermissionOnLaunch)` | `initialize(projectId, requestPermissionOnLaunch: ...)` |
| Identify user | `setUserId(userId)`                             | `setUserId(context, userId)`                                     | `setUserId(userId:)`                                                         | `setUserId(userId)`                                | `setUserId(userId)`                                     |
| Set tags      | `setTags(tags, useBeacon?)`                     | `setTags(context, JSONObject)`                                   | `setTags(tags:)`                                                             | `setTags(tags)`                                    | `setTags(tags)`                                         |
| Track event   | `trackEvent(type, data?, useBeacon?)`           | `trackEvent(context, type, JSONObject?)`                         | `trackEvent(type, data:)`                                                    | `trackEvent(type, data?)`                          | `trackEvent(type, data?)`                               |
| Show in-app   | `displayInApp(group, data?)`                    | `displayInApp(context, group, JSONObject?)`                      | `displayInApp(group:, data:)`                                                | `displayInApp(group, data?)`                       | `displayInApp(group, data?)`                            |

## Optional public surface

Use these only when the product flow actually needs them.

| Goal                            | Web                                                                       | Android                                                                                                     | iOS                                                                                                | React Native                                                                                   | Flutter                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Log level                       | `setLogLevel(level)`                                                      | `setLogLevel(level)`                                                                                        | `setLogLevel(level:)`                                                                              | `setLogLevel(level)`                                                                           | `setLogLevel(level)`                                                                    |
| Subscription state              | `getIsSubscribed(callback)` and `setIsSubscribed(isSubscribed, callback)` | `isSubscribed(context)`, `subscribe(context, fallbackToSettings, handler)`, `unsubscribe(context, handler)` | `isSubscribed(completion)`, `subscribe(fallbackToSettings, completion)`, `unsubscribe(completion)` | `isSubscribed(callback)`, `subscribe(fallbackToSettings, callback?)`, `unsubscribe(callback?)` | `isSubscribed()`, `subscribe(fallbackToSettings?, callback?)`, `unsubscribe(callback?)` |
| Device ID lookup                | `getDeviceId(callback)`                                                   | `getDeviceId(context)`                                                                                      | `getDeviceId()`                                                                                    | `getDeviceId()`                                                                                | `getDeviceId()`                                                                         |
| Notification click handler      | `setConvertedHandler(callback)`                                           | `setNotificationClickedHandler(handler)`                                                                    | `setNotificationClickedHandler(callback)`                                                          | `setNotificationClickedHandler(callback)`                                                      | `setNotificationClickedHandler(handler)`                                                |
| Foreground notification handler | none                                                                      | `setNotificationForegroundReceivedHandler(handler)`                                                         | `setNotificationForegroundReceivedHandler(callback)`                                               | `setNotificationForegroundReceivedHandler(callback)`                                           | `setNotificationForegroundReceivedHandler(handler)`                                     |
| In-app action handler           | `setInAppMessageActionHandler(handler)`                                   | `setInAppMessageActionHandler(handler)`                                                                     | `setInAppMessageActionHandler(callback)`                                                           | `setInAppMessageActionHandler(callback)`                                                       | `setInAppMessageActionHandler(handler)`                                                 |
| User attributes                 | `setUserAttributes(attributes, useBeacon?)`                               | `setUserAttributes(context, JSONObject)` in `1.10.0+`, else server Track API                                | `setUserAttributes(attributes:)` in `1.10.0+`, else server Track API                               | `setUserAttributes(attributes)` in `1.10.0+`, else server Track API                            | `setUserAttributes(attributes)` in `1.10.0+`, else server Track API                     |
| WebView bridge (hybrid apps)    | auto-detects native bridge; forwards `setUserId`/`setTags`/`trackEvent`/`setUserAttributes` | register `FlareLaneJavascriptInterface` on the `WebView`                                     | register `FlareLaneJavascriptInterface` on the `WKWebView`                                          | inject `FlareLaneJavascriptInterface.injectedJavaScript` + `onMessage`                         | wire `FlareLaneJavascriptInterface` via `webview_flutter` or `flutter_inappwebview`     |
| Disable auto click-URL open     | not configurable in Web SDK                                               | manifest `flarelane_dismiss_launch_url=true` or per-message `data`                                          | `Info.plist` `flarelane_dismiss_launch_url=YES` or per-message `data`                              | native flag + custom click handler                                                             | native flag + custom click handler                                                      |

## Server API surface

Server APIs are backend REST calls, not SDK public methods.

| Goal                                   | API                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Sync events, tags, and user attributes | Track API: `POST /v1/projects/{PROJECT_ID}/track`                      |
| Send push notifications                | Send Notifications API: `POST /v1/projects/{PROJECT_ID}/notifications` |
| Send email                             | Send Email API: `POST /v1/projects/{PROJECT_ID}/emails`                |
| Send SMS                               | Send SMS API: `POST /v1/projects/{PROJECT_ID}/sms`                     |
| Send Kakao Alimtalk                    | Send Kakao Alimtalk API: `POST /v1/projects/{PROJECT_ID}/alimtalk`     |

Server API credentials:

- `PROJECT_ID` and the project token are available in the FlareLane Console.
- Use `Authorization: Bearer <PROJECT_TOKEN>` from server-side code only.
- Use `Idempotency-Key` for retryable sends or Track calls where duplicates would matter.

Platform-specific utilities:

- Web: `setIsSubscribedChangeHandler(callback)` and `resetDevice()`
- Android: `getUserId(context)`, `getProjectId(context)`, and `resetDevice(context)`
- iOS: `resetDevice()`

Default integration scope:

- initialize FlareLane in the platform-correct lifecycle point
- wire `setUserId` to login, logout, or account switch
- wire `setTags` to stable user, device, locale, or consent properties
- wire `trackEvent` to meaningful product actions after the action actually succeeds
- wire `displayInApp` to a real screen, route, or CTA

Optional scope, only when required:

- `setLogLevel`
- `subscribe` and `unsubscribe`
- subscription state lookup
- device ID lookup for support or debug UX
- notification click or foreground handlers
- in-app action handlers
- `setUserAttributes` on Web, or on Android/iOS/React Native/Flutter when the installed SDK is `1.10.0+`
- web deferred loader or `beacon` patterns
- iOS Notification Service Extension
- WebView bridge wiring for hybrid apps that embed a FlareLane web page inside a native WebView
- disabling automatic notification click-URL opening when the app owns click routing (Android/iOS)
- server Track API sync for user attributes when the backend is authoritative, or when the installed mobile SDK predates `1.10.0`
- server Send API calls for push, email, SMS, or Kakao Alimtalk

## Cross-platform timing rules

- `initialize`: once per app or page bootstrap, not per screen render
- `setLogLevel`: before `initialize`, or as early in bootstrap as the repo allows
- `setUserId`: immediately after auth state becomes authoritative, and clear or change it on logout or account switch
- `setTags`: after profile, consent, locale, plan, or device traits are known or updated
- `setUserAttributes`: only on Web SDK, after `setUserId` and after stable profile fields are known
- mobile user attributes: sync through the server Track API when the backend has authoritative profile data
- `trackEvent`: after the business action completes successfully, not before optimistic UI only
- `displayInApp`: from a stable user-visible point such as a route enter, screen open, or CTA click
- subscribe or unsubscribe methods: from an onboarding CTA, settings screen, or explicit notification-permission control
- notification click and foreground handlers: register during bootstrap before the app starts reacting to push opens or foreground deliveries
- device ID lookup: expose only from support, QA, or explicit copy-to-clipboard flows
- in-app action handlers: register before the first in-app message can render
- server Track API: after the backend-owned fact or action is authoritative
- server Send APIs: from backend transactional flows, jobs, or workers after consent checks pass

## Package sources for latest version lookup

- Web default delivery: CDN script `https://cdn.flarelane.com/WebSDK.js`
- Android: Gradle coordinate `com.github.flarelane:flarelane-android-sdk`
- iOS: CocoaPods package `FlareLane`
- React Native: npm package `@flarelane/react-native-sdk`
- Flutter: pub.dev package `flarelane_flutter`

Rules:

- For a new integration, resolve the latest published version right before editing install files.
- After resolving the latest version, write an exact pinned version unless the target repo already has a deliberate dependency range policy.
- This version lookup rule applies to SDK packages only; server API calls do not require an SDK version.
- If the target project already pins a FlareLane version, keep that pin unless the user explicitly asks to upgrade or the needed API does not exist in the pinned version.
- Prefer registry metadata over README snippets.
- Do not write `latest`, `+`, `*`, or broad semver ranges for new FlareLane SDK dependencies unless the target repo deliberately uses that policy.

## Repo inspection order

1. Dependency manifests such as `package.json`, `build.gradle`, `Podfile`, or `pubspec.yaml`
2. Bootstrap entrypoints such as `main.tsx`, `_app.tsx`, `Application`, `AppDelegate`, `index.tsx`, or `main.dart`
3. Auth and profile state paths
4. Existing event instrumentation paths
5. Existing push, deep-link, and notification delegate code
6. Backend env config, API client, notification service, worker, queue, and webhook paths when server APIs are requested

## Minimal blocking questions

Ask only if the answer changes code:

- What is the FlareLane `projectId` for this environment?
- Should permission be requested on launch or later?
- On which lifecycle should `setUserId` set, change, or clear the current user?
- Which fields should become tags?
- Which stable profile fields belong in user attributes instead of tags, and is the current platform Web SDK or server Track API?
- Which events should call `trackEvent`, and with which payload keys?
- Which screen or interaction should call `displayInApp`, and with which group name?
- On web, can the app serve `/sw.js`, or is a custom `serviceWorkerPath` required?
- Does the product need custom subscribe or unsubscribe UI, or only the default permission flow?
- Does it need custom notification click, foreground, or in-app action handling?
- Does any support or QA flow need a surfaced device ID?
- For server APIs, which server-side env var should hold the project token?
- For server sends, which channel, target type, template or body, consent gate, and idempotency key source should be used?

## Rules of thumb

- Prefer a thin integration module over scattered direct SDK calls.
- Put initialization where the platform expects it.
- On web, prefer the script-tag priority order `head defer` -> `body bottom` -> `plain head`.
- Do not wire optional handlers or utility methods unless the product flow can actually trigger them.
- Preserve existing push, analytics, and deep-link code unless the user asks to replace it.
- Avoid unrelated cleanup while integrating FlareLane.
- If tag removal semantics matter, confirm current SDK or backend behavior instead of guessing.
- Do not expose the project token outside server-side code.
- Prefer a queued worker over synchronous loops for high-volume server sends.

## Verification checklist

Confirm at least:

- initialization runs once
- a device appears after app run
- permission state matches the product flow
- user ID becomes visible after login
- tags update after the chosen sync points
- events arrive with expected names and payload keys
- in-app display is triggered from a real path in the product
- subscribe or unsubscribe behavior works if that flow was wired
- handlers fire only if the app registered them
- device ID lookup works if the app surfaces it
- server API credentials stay server-side if Track or Send APIs were wired
- server API calls handle non-2xx responses and idempotent retries if sends can be retried
