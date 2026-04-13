# React Native Integration

Use this file for React Native apps.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- npm package: `@flarelane/react-native-sdk`
- Resolve the latest published npm version at integration time before editing `package.json`
- If the target repo already pins the package, keep that pin unless the user explicitly asks to upgrade or the needed API is unavailable
- Treat React Native as two layers: JS API calls plus native iOS and Android plumbing

## Public methods used in React Native

- Initialize: `initialize(projectId, requestPermissionOnLaunch)`
- Log level: `setLogLevel(level)`
- Identify user: `setUserId(userId)`
- Set tags: `setTags(tags)`
- Track event: `trackEvent(type, data?)`
- Show in-app: `displayInApp(group, data?)`
- User attributes: no public React Native SDK method; use the [server Track API](server-api.md)
- Permission surface: `isSubscribed(callback)`, `subscribe(fallbackToSettings, callback?)`, and `unsubscribe(callback?)`
- Notification and in-app handlers: `setNotificationClickedHandler(callback)`, `setNotificationForegroundReceivedHandler(callback)`, and `setInAppMessageActionHandler(callback)`
- Device utilities: `getDeviceId()`

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
- user attributes: sync through the [server Track API](server-api.md) after the backend has stable profile fields
- `displayInApp`: from a real screen open or CTA handler
- `isSubscribed`, `subscribe`, and `unsubscribe`: from onboarding or settings flows that own push preferences
- `getDeviceId`: from support, QA, or explicit copy-ID flows
- native iOS and Android push wiring: in their normal native delegate and application entrypoints

## Required setup shape

1. Install the React Native package.
2. Initialize from the JS entrypoint.
3. If the product customizes click, foreground, or in-app behavior, register the handlers once in the JS root layer.
4. If the product owns notification preferences, wire `isSubscribed`, `subscribe`, and `unsubscribe`.
5. If supported profile fields are required, add [server Track API](server-api.md) sync rather than a non-existent React Native `setUserAttributes` call.
6. Wire JS calls for `setUserId`, `setTags`, `trackEvent`, and `displayInApp`.
7. Inspect native `ios/` and `android/` folders and add the required notification plumbing.
8. Keep existing native modules and notification code intact.

## Questions that actually matter

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

- Do not stop after adding JS calls if native notification plumbing is absent.
- Prefer the repo's real entrypoint over a demo component for initialization.
- If the app is Expo-managed and native folders are missing, confirm whether generating native projects is acceptable before promising native changes.
- Do not register handlers inside a screen component that can remount often.
- Avoid duplicating initialization in hot-reload-only code paths.

## Verification

- App boots without native module errors.
- Initialization occurs once.
- Native iOS and Android projects still build.
- User ID, tags, events, and in-app display work from real product flows.
- Subscribe or unsubscribe flows work if the app owns notification settings.
- Click, foreground, and in-app action handlers run only when they were registered.
