# Android Integration

Use this file for native Android integrations.

Official docs, authoritative when this file is stale or silent: [Android SDK](https://flarelane.com/ko/docs/sdk-integrations/android-sdk), [FCM credentials](https://flarelane.com/ko/docs/sdk-integrations/fcm-setting), [notification icon](https://flarelane.com/ko/docs/sdk-integrations/android-notification-icon), [notification channels](https://flarelane.com/ko/docs/sdk-integrations/android-notification-channel). English: swap `/ko/` for `/en/`.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- Dependency coordinate: `com.github.flarelane:flarelane-android-sdk`
- Distributed through JitPack, so the repository `maven { url 'https://jitpack.io' }` must be reachable to the Gradle build; add it only if the target repo does not already have it. If `settings.gradle` uses `dependencyResolutionManagement` (especially `repositoriesMode = FAIL_ON_PROJECT_REPOS`), add JitPack there — adding it to the project/`allprojects` `build.gradle` will fail the build.
- Resolve the latest published version from registry metadata before editing Gradle
- If the target repo already pins a FlareLane Android version, keep that pin unless the user explicitly asks to upgrade or the needed API is unavailable

## Public methods used on Android

- Initialize: `initWithContext(context, projectId, requestPermissionOnLaunch)`
- Log level: `setLogLevel(level)`
- Identify user: `setUserId(context, userId)`
- Set tags: `setTags(context, JSONObject)`
- Track event: `trackEvent(context, type, JSONObject?)`
- Show in-app: `displayInApp(context, group, JSONObject?)` (a `displayInApp(context, group)` overload also exists)
- User attributes: `setUserAttributes(context, JSONObject)` in SDK `1.10.0+`; it only sends when a user ID is already set. On older versions, sync through the [server Track API](server-api.md). Verify against the installed version.
- Permission surface: `isSubscribed(context)`, `subscribe(context, fallbackToSettings, handler)`, and `unsubscribe(context, handler)`
- Notification and in-app handlers: `setNotificationClickedHandler(handler)`, `setNotificationForegroundReceivedHandler(handler)`, and `setInAppMessageActionHandler(handler)`
- Device utilities: `getDeviceId(context)`
- Rare utility surface from the SDK code: `getUserId(context)`, `getProjectId(context)`, and `resetDevice(context)`

## Common target files in the repo

- project and app Gradle files such as `build.gradle`, `build.gradle.kts`, or `settings.gradle`
- `AndroidManifest.xml`
- `Application` or `MainApplication`
- existing Firebase Messaging services or broadcast receivers
- login, profile, consent, and analytics layers

## Timing and location

- `initWithContext`: `Application.onCreate()`, not an `Activity`
- `setLogLevel`: before `initWithContext` when the app wants verbose logs or quieter production logging
- notification click, foreground, and in-app handlers: register during app bootstrap, usually in `Application.onCreate()`
- `setUserId`: after login success, logout, or account switch
- `setTags`: after stable profile or device fields are refreshed
- `trackEvent`: after a business event is confirmed
- user attributes: sync through the [server Track API](server-api.md) after the backend has stable profile fields
- `displayInApp`: from a real screen open, route, or CTA path
- `isSubscribed`: from a settings screen or explicit push-preference UI
- `subscribe`: from the chosen permission prompt flow when `requestPermissionOnLaunch` is `false`
- `unsubscribe`: from a settings or preference flow that lets the user stop notifications
- `getDeviceId`: from support, QA, or explicit copy-ID flows
- `resetDevice`: only from an explicit hard-reset, test-device, or environment-reset flow

## Required setup shape

1. Add the FlareLane repository if needed.
2. Add the dependency to the app module, and confirm `compileSdk`/`targetSdk` are **33 or higher** — below 33 the Android 13 notification permission prompt cannot appear, so users never get a chance to subscribe.
3. If an `Application` class already exists and is registered (`android:name`), add `initWithContext` to its existing `onCreate()` — do not create a second one. Create and register a new `Application` only if none exists; never declare two `android:name` entries or replace the customer's existing class (that would silently stop their crash-reporting/DI/other-SDK init).
4. Initialize FlareLane in that `Application.onCreate()`.
5. If the product customizes click, foreground, or in-app behavior, register the handlers during bootstrap.
6. If permission is deferred, wire a later `subscribe()` call.
7. If the product owns a push settings UI, wire `isSubscribed()` and `unsubscribe()` there.
8. If supported profile fields are required, call `setUserAttributes(context, JSONObject)` when the installed SDK is `1.10.0+`; otherwise sync through the [server Track API](server-api.md).
9. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from product logic, not one-off test buttons.

Before any of this can deliver, the user must have FCM credentials in the FlareLane Console: Firebase Cloud Messaging API (V1) enabled, a service-account key file, and the Sender ID entered in the console's app-push channel settings. Nothing in the repo shows whether that is done — surface it as a confirmation item.

## Recommended additions

Not required for delivery, but wire them on every Android integration without asking first — each is minutes of work now and awkward to retrofit once the app is live. See "Recommended surface" in [shared-surface](shared-surface.md).

Wire directly, from values already in the repo:

- Accent color: a **string** resource (not a color resource) named `flarelane_notification_accent_color`, for example `<string name="flarelane_notification_accent_color">#BC0000</string>`. Take the hex from the app's existing brand color (`colors.xml`, the theme's `colorPrimary`, or the design-token file) instead of inventing one.
- Default channel name: string resource `flarelane_default_channel_name`, phrased in the app's own language and tone (for example the app name plus "알림", matching existing user-facing strings).

Notification icon — needs an image asset, so do not treat it as an automatic edit:

- The SDK needs no code, only a drawable named exactly `ic_stat_flarelane_default`. Android draws small icons from the **alpha channel only**, so the asset must be a transparent-background silhouette. Feed it a full-color launcher icon and the user sees the notorious white blob or square.
- First look for a silhouette the repo already has: the Android 13 themed-icon `monochrome` layer in `mipmap-anydpi-v26/ic_launcher.xml`, an existing `ic_stat_*` drawable, or another push SDK's small icon. If one exists, reuse it — copy the vector under the new name, or add `res/drawable/ic_stat_flarelane_default.xml` as an `<inset>` wrapper pointing at it — and say in the report which source you used, so the design owner can override it.
- If the app only has a full-color launcher icon, stop there. Do not derive an icon from it, do not generate artwork, and do not ship a placeholder that ships a broken-looking notification. Report it as one hand-off line: name `ic_stat_flarelane_default`, transparent background, monochrome silhouette, generated through Android Studio's **New > Image Asset > Notification Icons** so all densities land at once. Note that until then Android falls back to a flattened app icon.
- Reusing the app's own channel: manifest meta-data `flarelane_default_channel_id`. Caution — once this key is present the SDK stops creating its own channel, so if the referenced channel does not exist at runtime, notifications are dropped silently. Only set it when the app definitely creates that channel first.
- Per-message overrides live in the send payload's `data`: `flarelane_notification_channel_id`, and `flarelane_notification_id` to make notifications replace each other instead of stacking.

Also worth wiring:

- `setLogLevel` in debug builds only, so the first delivery investigation is readable.
- A debug-only path that surfaces `getDeviceId(context)` (log line or hidden dev screen), so the team can register a test device and use console test sends instead of guessing.
- `isSubscribed` / `subscribe` / `unsubscribe` on the app's existing notification settings screen, so a user who declined can opt back in without a trip to OS settings.

## Disabling automatic click-URL opening

By default FlareLane opens the notification's landing URL or deep link automatically on click. Only disable this when the app must own click routing (for example, custom in-app navigation). The click is still delivered to `setNotificationClickedHandler`, so register a handler to route the URL yourself.

- App-wide: add manifest meta-data inside `<application>`:

  ```xml
  <meta-data android:name="flarelane_dismiss_launch_url" android:value="true" />
  ```

- Per-notification: include `"flarelane_dismiss_launch_url": "true"` in the send `data` payload.
- There is no handler return value that suppresses the URL; use the manifest flag or the per-message `data` key. Requires SDK `1.6.0+`.

## Questions that actually matter

Determine these — by inference from the repo wherever possible, and by listing the leftovers in one batch at the end. They are inputs to resolve, not a questionnaire to send first.

- Should permission be requested at launch or later?
- Does the app need custom click, foreground, or in-app action handling?
- Which login or logout lifecycle should map to `setUserId`?
- Which user or device properties should map to tags?
- Which profile fields should be synced through the server Track API as user attributes?
- Which product actions should map to `trackEvent`?
- Which screen or CTA should call `displayInApp`, and with which group?
- Does any support or QA flow need the device ID?

## Terms

- Application class: the process-wide Android entrypoint created before activities
- Gradle DSL: the Android build file format, either Kotlin or Groovy

## Caution points

- Do not move initialization into an `Activity` unless the app architecture truly cannot expose `Application`.
- FlareLane ships its own FCM receiver and Firebase sender. Leave the customer's existing `FirebaseMessagingService` intact for their own payloads, do not remove or re-point it, and verify FlareLane pushes still arrive alongside it.
- Keep Android 13+ notification permission behavior consistent with the product UX.
- Do not register handlers from a screen that may mount multiple times.
- Avoid firing duplicated initialization in multiple processes or test harnesses.

## Verification

- App boots without duplicate initialization.
- `compileSdk`/`targetSdk` are 33+ and the permission prompt appears on an Android 13+ device.
- A device appears in FlareLane after app launch.
- A real send from the console arrives on the device, and the customer's existing push stack still delivers alongside it.
- If permission was deferred, `subscribe()` works from the chosen product path.
- If settings ownership was added, `isSubscribed()` and `unsubscribe()` reflect the intended state.
- `setUserId`, `setTags`, and `trackEvent` fire after the intended flows.
- `displayInApp()` is reachable from the intended UI path.
- Click, foreground, and in-app handlers run only when the app registered them.
