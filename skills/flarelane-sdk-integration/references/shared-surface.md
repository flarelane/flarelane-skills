# Shared Surface

Read this file first, then read exactly one platform file or [server-api](server-api.md).

Official docs: https://flarelane.com/ko/docs/ (English: `/en/docs/`) for SDK and console topics, and the public API reference https://flarelane-api-docs.readme.io/reference/track for server API questions. Treat them as the authority whenever this skill is stale, silent, or contradicted; page links are in [staying-current](staying-current.md).

For `setUserId`, tags, events, user attributes, segmentation, personalization, or automation data, also read [data-modeling](data-modeling.md).

Before editing install files or wiring SDK calls, run the best-effort freshness check in [staying-current](staying-current.md) so the skill and the pinned SDK versions stay up to date.

## Deployment model

This skill must remain usable after publication without access to this workspace's SDK source code.

- Trust the target repo first.
- Trust the public SDK and server API contracts in this skill second.
- Use package registry metadata only to resolve the latest published SDK version at integration time.
- Do not depend on official-doc URLs to *start* the work, but treat the official docs as the fallback authority when this skill is stale, silent, or contradicted: `https://flarelane.com/ko/docs/` (English: `/en/docs/`) for SDK and console topics, and the public API reference `https://flarelane-api-docs.readme.io/reference/track` for server API questions. Page-by-page links are in [staying-current](staying-current.md).
- On web, prefer the CDN script tag plus root `sw.js`.
- For server APIs, keep the project token in backend secrets only and do not add it to client or mobile code.

## Delivery baseline: mandatory, and exempt from the minimal-diff rule

"Smallest change that satisfies the request" governs **product code**. It never governs the platform plumbing a notification must travel through. Skip any of it and the app still compiles, a device may still register, and the customer's first real send silently fails or arrives degraded. That is the most common integration complaint: "연동은 했는데 푸시가 안 옵니다."

Treat every row below as required work for the platform being integrated, even when the user only asked to "add the SDK". Do not label it optional, do not defer it to a later phase, and do not report the integration as complete while any row is unresolved.

| Platform                  | Mandatory baseline before push can work                                                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS (native, RN, Flutter) | Push Notifications capability; Background Modes with Remote notifications; a Notification Service Extension target; App Group `group.<bundleID>.flarelane` added **and enabled on both** the main app and the extension; FlareLane added to both targets; device-token and notification-center delegate forwarding; a deployment target of **iOS 15.0+ (FlareLane 1.11.3+)** on both targets |
| Android                   | JitPack repository reachable; dependency in the app module; init in `Application.onCreate()`; `compileSdk`/`targetSdk` 33+ so the Android 13 notification permission prompt can appear                                                                                          |
| React Native              | Everything in the iOS and Android rows, plus JS `initialize`. JS alone is not an integration                                                                                                                                                                                    |
| Flutter                   | Everything in the iOS and Android rows, plus Dart `initialize`. The Dart call is half the work                                                                                                                                                                                  |
| Web                       | `sw.js` reachable at the site root over `https://`, and the console web-push site URL matching the deployed origin exactly                                                                                                                                                      |
| Web on iOS                | `manifest.json` linked from `<head>` with `name`, `icons`, `display`, plus install via "Add to Home Screen" on iOS 16.4+                                                                                                                                                        |

### Console-side prerequisites you cannot complete

Push credentials live in the FlareLane Console and Apple/Firebase/Google consoles. Nothing in the repo reveals whether they are set, and without them every send fails no matter how correct the code is. Do not silently assume they exist: state them in the final response as items for the user to confirm.

- iOS/APNs: the app's App Identifier registered in Apple Developer, an APNs `.p8` key, its Key ID, and the Team ID entered in the FlareLane Console under the app-push channel settings.
- Android/FCM: Firebase Cloud Messaging API (V1) enabled, a service-account key file, and the Sender ID entered in the FlareLane Console.
- Web: the web-push channel created in the console with the site name and the **exact** `https://` root URL. A mismatched URL means web push never works, with no error in the code.
- Every platform: the `projectId` for this environment (and, for server APIs, a server-only project token).

### Work only a human can do in an IDE

Some baseline steps cannot be completed by editing files alone — most notably creating an Xcode target, and the provisioning side of capabilities. Follow this protocol instead of quietly dropping them:

1. Do everything that *is* file-editable, and say which file each change landed in.
2. Emit the remaining steps as one ordered, click-by-click checklist the user can follow without re-deriving anything (target type, exact product name, exact App Group id, exact deployment target to match).
3. Report status as "code complete, N manual steps pending" — never "integration complete" — and repeat the verification that only passes once those steps are done.
4. Offer to verify afterwards (build, entitlements diff, a real test send).

## Three tiers of scope

Sort every candidate piece of work into one of these before writing code. The mistake to avoid is collapsing tiers 1 and 2 into "not asked for, so skip".

1. **Baseline (above)** — mandatory. Do it, or hand it back as a named pending step.
2. **Recommended (below)** — worth doing on almost every integration because it makes the product measurably more useful in FlareLane, and it is far cheaper to wire now than to retrofit after launch. Just build it: no proposal step, no permission question. Implement everything the repo has a natural hook for, and report each item as wired or skipped with its reason.
3. **On request only** — everything else. Custom handlers with no product need, speculative abstractions, retries, caching, feature flags, refactors. These stay out unless asked.

## Recommended surface

Wire these as part of the integration, without asking first. They are standard practice, not a menu.

Where an item needs a value you do not have — the `displayInApp` group name, which events matter, which field holds consent — infer it from the repo (existing analytics event names, consent columns, settings screens), pick the obvious option, and name the assumption in the final report so the user can correct one line instead of answering a questionnaire up front. Skip an item only when the repo genuinely has no hook (no settings screen, no WebView, no consent model, the product does not hold the field), and say which reason applied. If the user later says an item was unwanted, remove it — cheaper for everyone than blocking the integration on a decision round.

| Recommendation                       | Why it is worth doing now                                                                                                                     | Skip only when                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| All supported user attributes         | FlareLane interprets `email`, `phoneNumber`, `dob`, `timeZone`, `name`, `country`, `language` natively for targeting, personalization, and email/SMS sends. Official guidance is to sync as many as the product has | the product does not hold the field at all                 |
| One-time backfill for existing users  | Change-triggered sync alone leaves every pre-existing user invisible until they next log in, so day-one campaigns can only reach a fraction of the base. Recommended practice is change-sync **and** an initial bulk sync. Deliver the script; let the customer run it | brand-new product with no existing users                   |
| Marketing consent as a tag            | Without it, the customer cannot legally separate promotional from transactional sends inside FlareLane                                          | the product has no consent model (then say so plainly)     |
| Core product events                   | Events are what journey automation and conversion analytics run on; an integration with zero events can only do manual blasts                   | the user wants to define the event taxonomy first           |
| In-app message trigger (`displayInApp`) | One line, and it unlocks a whole channel the customer already pays for                                                                       | no screen or CTA is a sensible host                        |
| Push preference UI wiring             | `isSubscribed` / `subscribe` / `unsubscribe` on an existing settings screen, so users can opt back in without going to OS settings              | the app has no settings or preference surface              |
| WebView bridge                        | In a hybrid app, web-side `setUserId`/tags/events otherwise never reach the device                                                             | the app renders no product WebView                         |
| Android notification color and channel name | Both are string resources you can fill from the app's existing brand color and copy                                                       | the repo exposes no brand color to reuse                    |
| Android notification icon             | Without an alpha-only silhouette named `ic_stat_flarelane_default`, Android flattens the launcher icon into a white blob                        | see the asset rule below — reuse or hand off, never fabricate |
| Web `manifest.json`                   | Without it there is no iOS web push at all                                                                                                     | the site already has a valid manifest, or iOS is out of scope |
| `setLogLevel` in debug builds         | Makes the first "why is nothing arriving" investigation take minutes instead of hours                                                          | the repo has no debug/release distinction to hang it on    |
| Test-device registration for QA       | Surfacing the device ID lets the customer use console test sends instead of guessing                                                            | never worth skipping; it is one call behind a debug screen  |

Some recommended items need an input only a human has — artwork, brand copy, a credential, a legal decision. "Do not ask first" does not mean inventing them:

1. Reuse what the repo already contains (an existing monochrome/notification drawable, the theme's brand color, existing user-facing strings), and say in the report which source you used so the owner can override it.
2. If nothing suitable exists, do not fabricate the asset and do not commit a placeholder that ships visibly broken output. Report it as one hand-off line with the exact name, format, and tool to produce it.
3. Never generate artwork or logos, and never guess a credential.

Two non-code items cannot be wired in code, so report them as follow-ups for the customer:

- Define the synced events and tags in the console's customer-data page, so marketers see them in dropdowns instead of raw keys.
- Update the privacy policy's processing-delegation section. FlareLane processes personal data on the customer's behalf; the entry to disclose is 수탁사 (주)플레어랩스, 내용 "정보성/광고성 메시지 발송 대행".

Prefer the server Track API over client SDK calls for data the backend already owns: it does not need an app release to change, and it covers users who never open the app.

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

Server APIs are backend REST calls, not SDK public methods. Only the publicly documented endpoints below may be used — see "Allowed API surface" in [server-api](server-api.md).

| Goal                                   | API                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Sync events, tags, and user attributes | Track API: `POST /v1/projects/{PROJECT_ID}/track`                      |
| Send push notifications                | Send Notifications API: `POST /v1/projects/{PROJECT_ID}/notifications` |
| Send email                             | Send Email API: `POST /v1/projects/{PROJECT_ID}/emails`                |
| Send SMS                               | Send SMS API: `POST /v1/projects/{PROJECT_ID}/sms`                     |
| Send Kakao Alimtalk                    | Send Kakao Alimtalk API: `POST /v1/projects/{PROJECT_ID}/alimtalk`     |

Server API credentials:

- `PROJECT_ID` and the project token are both found in the FlareLane Console but have different trust levels: `projectId` is a public client identifier (safe in client code), while `PROJECT_TOKEN` is a server-only secret. They are different values — never swap them or co-locate them.
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

Recommended scope, wired by default without asking (see "Recommended surface" above):

- all supported user attributes the product holds
- a one-time backfill plus change-triggered sync for tags and attributes
- marketing consent as a tag
- core product events and one `displayInApp` trigger
- subscription state wiring when a settings surface exists
- WebView bridge in hybrid apps
- Android notification icon, accent color, and channel naming
- web `manifest.json` for iOS web push
- `setLogLevel` in debug builds and a device-ID path for test-device registration

On-request scope, only when the product needs it (the delivery baseline is never in this list):

- custom notification click, foreground, or in-app action handlers, when the product has real routing or UI logic to run
- disabling automatic notification click-URL opening, when the app must own click routing (Android/iOS)
- reusing the app's own Android notification channel through `flarelane_default_channel_id`
- web deferred loader or `beacon` patterns
- server Send API calls for push, email, SMS, or Kakao Alimtalk
- new abstractions, wrappers, retries, caching, or feature flags around any of the above

## Cross-platform timing rules

- `initialize`: once per app or page bootstrap, not per screen render
- `setLogLevel`: before `initialize`, or as early in bootstrap as the repo allows
- `setUserId`: immediately after auth state becomes authoritative, and clear or change it on logout or account switch
- `setTags`: after profile, consent, locale, plan, or device traits are known or updated
- `setUserAttributes`: after `setUserId` and after stable profile fields are known — Web at any version, mobile on SDK `1.10.0+`
- mobile on SDK below `1.10.0`: the client method does not exist, so sync user attributes through the server Track API instead
- any platform or version where the backend owns the authoritative profile data: prefer the server Track API over the client method
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
- Before pinning that version, confirm its minimum requirements are satisfied by the target repo: Android `minSdk`, iOS deployment target (currently **iOS 15.0+ (FlareLane 1.11.3+)**), and the repo's Gradle/AGP, CocoaPods, Node, or React Native versions. If the latest version's minimums exceed what the repo meets, pin the newest version whose minimums the repo already satisfies rather than silently forcing the customer to raise their floor. Never adopt a new major version without checking its API against this skill.
- After resolving the version, write an exact pinned version unless the target repo already has a deliberate dependency range policy.
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

## Inputs from the user, without stalling

Almost nothing here should halt the integration. Sort each missing input, handle it, and keep going:

| Input                                        | Default handling                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| iOS App Group id                             | derive it: `group.<bundleID>.flarelane` from the target's real bundle identifier — never ask                          |
| iOS extension target name                    | reuse an existing extension, else default to `FlareLaneNotificationServiceExtension`                                 |
| Web service worker path / site origin        | read the deploy config and public directory; only surface it if the repo genuinely cannot serve `/sw.js`              |
| `setUserId` lifecycle points                 | wire the repo's real login, logout, and account-switch paths                                                         |
| Tags, events, consent field                  | infer from existing analytics calls, consent columns, and domain services; name the choice in the report              |
| `displayInApp` group and trigger             | pick the obvious screen or CTA and a readable group name; one line to correct later                                  |
| Permission timing                            | default `requestPermissionOnLaunch: true` unless the repo has an onboarding or permission-priming flow to hook into   |
| `projectId`                                  | wire it through the repo's existing config or env mechanism with a clearly named key, and list the key as needed      |
| Server project token                         | wire the **env var name** only. Never a literal, never a guess                                                       |
| Console-side IDs (template IDs, sender email) | wire as named config values, and list them as needed — these cannot be inferred or invented                          |

Rules:

- Never fabricate a value that would look real in a diff. A made-up `projectId` or template ID passes review and then fails silently in production. Placeholders must be obvious: a named config key or env var plus a `TODO`, never `abc123`-shaped filler.
- Collect every outstanding value into **one** "values I need from you" block at the end of the work, not a sequence of separate questions. Keep integrating everything that does not depend on them.
- Ask a question standalone and up front only when proceeding under any assumption would be unsafe or would waste the work: which platform, when the repo has several and the request is ambiguous; whether to replace an existing push stack; anything that would send real messages to real users.
- When an answer arrives, apply it and continue to the end of the integration rather than pausing again for confirmation.

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

A build that compiles proves nothing about delivery. Confirm at least:

- the delivery baseline for this platform is fully in place, or the pending manual steps are listed explicitly
- push credentials (APNs, FCM, or the web-push site URL) are confirmed set in the console
- initialization runs once
- a device appears after app run, and the app version shown on the device matches the real build
- permission state matches the product flow, and allowing permission flips the device to subscribed
- a real send from the console arrives on the device
- an **image** send arrives with its image rendered — this is what proves the iOS extension and App Group are actually wired
- clicking a notification increments the click count in console statistics
- the customer's own existing push stack still delivers, with no duplicate or swallowed notifications
- deep links and web links from a notification route as intended
- user ID becomes visible after login
- tags update after the chosen sync points
- events arrive with expected names and payload keys
- in-app display is triggered from a real path in the product
- subscribe or unsubscribe behavior works if that flow was wired
- handlers fire only if the app registered them
- device ID lookup works if the app surfaces it
- server API credentials stay server-side if Track or Send APIs were wired
- server API calls handle non-2xx responses and idempotent retries if sends can be retried
