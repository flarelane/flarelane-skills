# Android Integration

Use this file for native Android integrations.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- Dependency coordinate: `com.github.flarelane:flarelane-android-sdk`
- Resolve the latest published version from registry metadata before editing Gradle
- If the target repo already pins a FlareLane Android version, keep that pin unless the user explicitly asks to upgrade or the needed API is unavailable
- Add the Maven repository required by the published package only if the target repo does not already have it

## Public methods used on Android

- Initialize: `initWithContext(context, projectId, requestPermissionOnLaunch)`
- Log level: `setLogLevel(level)`
- Identify user: `setUserId(context, userId)`
- Set tags: `setTags(context, JSONObject)`
- Track event: `trackEvent(context, type, JSONObject?)`
- Show in-app: `displayInApp(context, group, JSONObject?)`
- User attributes: no public Android SDK method; use the [server Track API](server-api.md)
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
2. Add the dependency to the app module.
3. Ensure the app has an `Application` class.
4. Register that `Application` in `AndroidManifest.xml`.
5. Initialize FlareLane in `Application.onCreate()`.
6. If the product customizes click, foreground, or in-app behavior, register the handlers during bootstrap.
7. If permission is deferred, wire a later `subscribe()` call.
8. If the product owns a push settings UI, wire `isSubscribed()` and `unsubscribe()` there.
9. If supported profile fields are required, add [server Track API](server-api.md) sync rather than a non-existent Android `setUserAttributes` call.
10. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from product logic, not one-off test buttons.

## Questions that actually matter

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
- Preserve existing Firebase Messaging or notification code and merge carefully.
- Keep Android 13+ notification permission behavior consistent with the product UX.
- Do not register handlers from a screen that may mount multiple times.
- Avoid firing duplicated initialization in multiple processes or test harnesses.

## Verification

- App boots without duplicate initialization.
- A device appears in FlareLane after app launch.
- If permission was deferred, `subscribe()` works from the chosen product path.
- If settings ownership was added, `isSubscribed()` and `unsubscribe()` reflect the intended state.
- `setUserId`, `setTags`, and `trackEvent` fire after the intended flows.
- `displayInApp()` is reachable from the intended UI path.
- Click, foreground, and in-app handlers run only when the app registered them.
