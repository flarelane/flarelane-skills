# Flutter Integration

Use this file for Flutter apps.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- pub.dev package: `flarelane_flutter`
- Resolve the latest published pub.dev version at integration time before editing `pubspec.yaml`
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
- user attributes: sync through the [server Track API](server-api.md) after the backend has stable profile fields
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
8. Complete the native setup — the Dart API alone does not deliver push. On iOS add the Push Notifications capability and Background Modes (remote notifications), reconcile `AppDelegate` with any existing notification handling (see below), and add a Notification Service Extension if rich media is needed; on Android confirm the manifest and any existing FCM service still coexist. Verify a real push is delivered, not just that the app compiles.

## Questions that actually matter

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

- The Dart API is only half the integration. The native iOS and Android setup still matters.
- Preserve existing notification plugins and reconcile them carefully.
- If the app already has an AppDelegate or native notification handlers, merge rather than replace.
- Do not register handlers from widgets that rebuild frequently.
- Avoid running initialization from widget rebuild paths.
- To take over click routing, there is no Dart flag: set the native `flarelane_dismiss_launch_url` flag (Android manifest meta-data, iOS `Info.plist`) or per-message `data`, then handle the URL in `FlareLane.shared.setNotificationClickedHandler`.

## Verification

- Flutter app boots without plugin initialization errors.
- Device registration succeeds.
- Native iOS and Android projects still compile.
- User ID, tags, events, and in-app display work from real product flows.
- Subscribe or unsubscribe flows work if the app owns notification settings.
- Click, foreground, and in-app action handlers run only when they were registered.
