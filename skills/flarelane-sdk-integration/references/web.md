# Web Integration

Use this file for browser web push integrations.

For user ID, events, tags, or user attributes, also read [data-modeling](data-modeling.md).

## Install contract

- Default delivery on web: FlareLane CDN script tag.
- Script tag priority:
  1. `<head>` with `defer`
  2. very bottom of `<body>`
  3. plain `<head>` only when neither of the above is feasible
- Serve a root `sw.js` file unless the product truly needs a custom `serviceWorkerPath`.
- Root `sw.js` contents:

```js
importScripts("https://cdn.flarelane.com/ServiceWorker.js");
```

- Default CDN source:

```html
<script src="https://cdn.flarelane.com/WebSDK.js" charset="utf-8"></script>
```

## Public methods used on web

- Initialize: `initialize({ projectId, serviceWorkerPath? })`
- Log level: `setLogLevel(level)`
- Identify user: `setUserId(userId)`
- Set tags: `setTags(tags, useBeacon?)`
- Track event: `trackEvent(type, data?, useBeacon?)`
- Show in-app: `displayInApp(group, data?)`
- Subscription surface: `getIsSubscribed(callback)`, `setIsSubscribed(isSubscribed, callback)`
- Notification and in-app handlers: `setConvertedHandler(callback)`, `setInAppMessageActionHandler(handler)`
- Device and profile utilities: `getDeviceId(callback)`, `setUserAttributes(attributes, useBeacon?)`
- Rare utility surface from the SDK code: `setIsSubscribedChangeHandler(callback)` and `resetDevice()`

## Common target files in the repo

- server-rendered HTML shell such as `index.html`, `public/index.html`, layout HTML, or template partials
- browser bootstrap files that can safely run once in the client
- root service worker file such as `public/sw.js`, `static/sw.js`, or emitted `/sw.js`
- auth, profile, and consent state modules
- existing analytics or event dispatch layer

## Timing and location

- `initialize`: once in the browser bootstrap path after the SDK script becomes available
- `setLogLevel`: before `initialize` when verbose logging or quiet mode matters
- `sw.js`: present at the root URL before production rollout, unless `serviceWorkerPath` is explicitly configured
- `setUserId`: after login, logout, or account switch
- `setTags`: after stable profile, consent, locale, plan, or device traits change
- `setUserAttributes`: after `setUserId` and after stable supported profile fields such as email, phone number, birthday, `timeZone`, name, country, or language are known
- `trackEvent`: after a real user action succeeds
- `displayInApp`: from a real page, route entry, or CTA handler
- `getIsSubscribed` and `setIsSubscribed`: from a settings screen, onboarding CTA, or explicit subscription toggle
- `setConvertedHandler`: during bootstrap before the app handles notification-driven landings
- `setInAppMessageActionHandler`: before the first in-app message can render if the app needs custom actions
- `getDeviceId`: from a support, QA, or explicit copy-ID flow
- `useBeacon = true`: only for fire-and-forget sync paths such as page leave, checkout completion, or settings save where the page may close immediately

## Preferred script placements

### 1. Preferred: `<head>` with `defer`

Use this when you control the HTML shell and want the SDK download to start early without blocking parsing.

```html
<head>
  <script
    src="https://cdn.flarelane.com/WebSDK.js"
    charset="utf-8"
    defer
  ></script>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      FlareLane.initialize({ projectId: "PROJECT_ID" });
    });
  </script>
</head>
```

`defer` means the browser downloads the script during HTML parsing but executes it after parsing ends.

### 2. Fallback: very bottom of `<body>`

Use this when the project already puts third-party scripts at the end of the document.

```html
<body>
  ...
  <script src="https://cdn.flarelane.com/WebSDK.js" charset="utf-8"></script>
  <script>
    FlareLane.initialize({ projectId: "PROJECT_ID" });
  </script>
</body>
```

### 3. Last resort: plain `<head>`

Use this only when neither `defer` nor body-bottom insertion is feasible. This can block rendering because the browser pauses parsing while it loads and runs the script.

```html
<head>
  <script src="https://cdn.flarelane.com/WebSDK.js" charset="utf-8"></script>
  <script>
    FlareLane.initialize({ projectId: "PROJECT_ID" });
  </script>
</head>
```

## Advanced patterns

### Deferred command queue

Use this only when some inline product code must schedule FlareLane work before the SDK finishes loading.

```html
<head>
  <script
    src="https://cdn.flarelane.com/WebSDK.js"
    charset="utf-8"
    defer
  ></script>
  <script>
    window.FlareLaneDeferred = window.FlareLaneDeferred || [];
    window.FlareLaneDeferred.push((FlareLane) => {
      FlareLane.initialize({ projectId: "PROJECT_ID" });
    });
  </script>
</head>
```

### Beacon delivery

`beacon` means the browser `sendBeacon` API. It is useful when the page may unload before a normal async request finishes.

Examples:

```js
FlareLane.setTags({ plan: "pro" }, true);
FlareLane.trackEvent("checkout_completed", { orderId: 42 }, true);
FlareLane.setUserAttributes({ language: "ko" }, true);
```

Use `beacon` only when losing the request during navigation or tab close is a realistic risk. Do not turn it on everywhere by default.

### WebView bridge for hybrid apps

When the same web page is loaded inside a native app WebView that has FlareLane wired, the Web SDK can forward behavior to the native SDK so the app and web page share one device and user.

- Detection is automatic. The Web SDK activates bridge mode when it finds `window.FlareLaneBridge` (Android JavascriptInterface) or `window.webkit.messageHandlers.FlareLaneBridge` (iOS WKWebView). There is no public web method to turn it on.
- The native side registers those globals via `FlareLaneJavascriptInterface` (see the [android](android.md), [ios](ios.md), [react-native](react-native.md), and [flutter](flutter.md) references). The web page itself needs no bridge-specific code.
- Under the bridge, `setUserId`, `setTags`, `trackEvent`, and `setUserAttributes` forward to the native SDK. `initialize` and the subscription methods (`getIsSubscribed`, `setIsSubscribed`, `setConvertedHandler`, `setIsSubscribedChangeHandler`) become no-ops because the native app drives init and permissions.
- Keep the normal web setup as-is; do not branch the web code for bridge vs standalone. The SDK handles both.

## Required setup shape

1. Add the root `sw.js` file or configure an explicit `serviceWorkerPath`.
2. Add the CDN script using the priority order above.
3. Initialize exactly once with `projectId`.
4. Wire `setUserId`, `setTags`, `trackEvent`, and `displayInApp` from real product flows.
5. Wire `setUserAttributes` only for supported profile fields and only after the user ID is available.
6. Add `getIsSubscribed` or `setIsSubscribed` only if the product owns a push preference UI.
7. Register `setConvertedHandler` or `setInAppMessageActionHandler` only if custom click or action handling is required.
8. Add deferred queue code only if other inline scripts must run before the SDK becomes callable.
9. Use `beacon` only for tag, event, or user-attribute sync paths that must survive page exit.

## Questions that actually matter

- What is the FlareLane `projectId` for this environment?
- Can the site serve `/sw.js`, or do you need a custom `serviceWorkerPath`?
- Which auth lifecycle should set and clear the FlareLane user ID?
- Which fields should become supported user attributes, and which should remain custom tags?
- Which real product events should call `trackEvent`, and which payload keys should be sent?
- Which screen or CTA should call `displayInApp`, and with which group name?
- Does the site need an explicit subscribe toggle or only the default permission flow?
- Does a notification click landing need custom conversion handling?
- Does any support or QA screen need the FlareLane device ID?

## Terms

- Root URL: the top-level browser path where the service worker file must be reachable
- `defer`: a browser script option that downloads during parsing and runs after parsing finishes
- `beacon`: a browser API for sending data in the background, especially useful when the page is about to unload

## Caution points

- Do not add `setCurrentPath`. It still exists but is a deprecated no-op that only logs a warning; the web SDK now recognizes the current path automatically.
- The web SDK always opens the notification's landing URL on click; there is no option to disable automatic click-URL processing on web (that mechanism exists only on Android and iOS).
- Do not initialize on every render or on every client-side navigation.
- Do not place `sw.js` under a nested route path unless `serviceWorkerPath` matches that path exactly.
- Do not use the body-bottom pattern if some earlier inline code already calls FlareLane.
- Do not wire `setConvertedHandler` twice from multiple bootstrap paths.
- Do not expose `resetDevice()` in normal product UI unless the user explicitly wants a hard reset flow.
- Do not use `beacon` for every request by habit; keep it for unload-sensitive flows.
- Use `displayInApp()` from a real product path, not a temporary debug button only.

## Verification

- Visit the served site over `https://`.
- Confirm `/sw.js` is reachable, or confirm the configured `serviceWorkerPath` resolves.
- Confirm `initialize()` runs once and does not repeat on route changes or re-renders.
- Confirm the browser loads `https://cdn.flarelane.com/WebSDK.js`.
- Confirm user ID, tags, and events update after the chosen flows.
- Confirm `displayInApp()` is triggered from the intended page or action.
- Confirm subscription status or toggle behavior if `getIsSubscribed` or `setIsSubscribed` was wired.
- Confirm conversion and in-app action handlers fire only from the intended flows.
- Confirm device ID lookup works if the app surfaces it.
- If using the deferred queue, confirm queued calls flush after initialization.
- If using `beacon`, confirm the relevant requests still leave the browser during navigation or tab close.
