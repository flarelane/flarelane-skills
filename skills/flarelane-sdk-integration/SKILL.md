---
name: flarelane-sdk-integration
description: Integrate FlareLane into existing web, Android, iOS, React Native, Flutter, or backend codebases. Use when Codex needs to add, repair, or review FlareLane client SDK integration, server Track API sync, or server Send APIs for push, email, SMS, and Kakao Alimtalk; wire public SDK methods such as initialize, setUserId, setTags, trackEvent, displayInApp, subscribe/unsubscribe, log-level setup, device ID lookup, notification click or foreground handlers, user attributes, or place FlareLane code in the correct lifecycle files such as service workers, Application/AppDelegate, notification delegates, notification service extensions, API clients, or worker jobs. Recommended install: npx skills add flarelane/flarelane-skills.
---

# FlareLane Integration

## Overview

Use this skill to integrate or review FlareLane work in a real product codebase without scattering SDK calls or API requests everywhere. Detect the target surface from the repo, read the shared reference plus one target-specific reference, then make the smallest architecture-consistent change that wires the requested SDK public methods or server API calls. Prefer the least code that cleanly satisfies the request. Avoid speculative abstractions, new layers, or broad cleanup unless the target codebase already depends on them or the request truly needs them. When tags, events, or user data already flow through another analytics tool in the repo, inspect that path first and reuse the same stable business values when FlareLane semantics match. The skill should remain deployable as-is, without depending on local workspace files or stable official-doc URLs.

## Stay current

Before editing install files or wiring SDK calls, run the best-effort freshness check in [staying-current](references/staying-current.md). It keeps two things fresh: the skill itself (compare the installed skill version to the canonical source and tell the user how to update if behind) and the FlareLane SDK dependency (resolve the latest published version and confirm version-gated methods against what the target repo installs). The check is non-blocking: if the network is unavailable, note it and continue with what is installed.

## Workflow

1. Detect the target surface before asking questions.
   - Web: `package.json`, framework entrypoints, `public/sw.js`, `index.html`, router bootstrap.
   - Android: `app/build.gradle*`, `AndroidManifest.xml`, `Application`, `MainApplication`.
   - iOS: `Podfile`, `AppDelegate`, `.xcodeproj`, notification extension targets.
   - React Native: `react-native` dependency plus `android/` and `ios/`.
   - Flutter: `pubspec.yaml`, `lib/main.dart`, `android/`, `ios/`.
   - Server API: backend package manifests, environment config, API client modules, message or notification services, queue or worker jobs, and tests.
   - For `setUserId`, `setTags`, `trackEvent`, or user-attribute work, also detect any existing analytics wrapper, user-property sync, or event bus before placing new FlareLane calls.
   - Trace stable domain values behind those existing payloads instead of copying screen-local derived values or vendor-specific transformed objects.
   - If the repo contains multiple platforms, ask which one to change only when the request is ambiguous.

2. Load the right references.
   - Always read [shared-surface](references/shared-surface.md).
   - Read [data-modeling](references/data-modeling.md) whenever the request touches `setUserId`, `setTags`, `trackEvent`, user attributes, segmentation, personalization, or automation data.
   - Then read exactly one of:
     - [web](references/web.md)
     - [android](references/android.md)
     - [ios](references/ios.md)
     - [react-native](references/react-native.md)
     - [flutter](references/flutter.md)
     - [server-api](references/server-api.md)
   - Treat target repo code plus the distilled contracts in these reference files as the default evidence.
   - For SDK integrations, resolve the latest published SDK version at integration time from the platform's official package source before editing install files, then write an exact pinned version unless the target repo already has a different dependency policy.
   - Do not copy a workspace snapshot version into another repo.
   - If the target repo already pins a FlareLane version, keep that pin unless the user explicitly asks to upgrade or the required API is unavailable.
   - Do not add dynamic ranges such as `latest`, `+`, `*`, or broad semver ranges for new FlareLane SDK dependencies unless the target repo deliberately uses that policy.
   - For server API integrations, use the API contract in [server-api](references/server-api.md); there is no SDK version to pin unless the target repo already has its own generated client.
   - Do not search docs to unblock routine integration work. Continue from the target repo and these reference contracts instead.

3. Keep questions minimal and late.
   - Do not ask which platform if the repo already shows it.
   - Do not ask for data you can infer from code or config.
   - Ask only when the answer changes code:
     - `projectId`
     - permission prompt timing
     - login/logout points for `setUserId`
     - tag and event source fields
     - which existing analytics contract should win if multiple tools describe the same business signal differently
     - `displayInApp` group name and trigger point
     - web service worker path or root URL
     - iOS extension name or App Group when not discoverable
     - server API `projectId`, project token environment variable name, send channel, target identifier, template or message body, consent gate, and idempotency key source
   - Ask one blocking question at a time.
   - When presenting options, explain pros and cons briefly.

4. Prefer the thinnest viable integration shape.
   - Start from the smallest code change that satisfies the request and fits the target repo.
   - Use a small wrapper, service, or integration module only if the codebase already has a service or data layer, or if it prevents real duplication.
   - Put initialization in the platform-correct lifecycle location.
   - Avoid direct SDK calls from random screens when a shared module is already the natural integration point.
   - If another analytics wrapper already dispatches the same tag, event, or identify flow, extend that existing dispatch point before creating a second parallel path.
   - Do not add new hooks, managers, factories, config layers, or helper files just to make the code feel more "architected".
   - If the app is tiny and a wrapper adds ceremony without value, keep the integration direct and minimal.

5. Implement only the requested surface by default.
   - Core SDK surface: `initialize`, `setUserId`, `setTags`, `trackEvent`, `displayInApp`.
   - Core server surface: Track API for `events`, `tags`, and `userAttributes`; Send APIs for push notifications, email, SMS, and Kakao Alimtalk.
   - If the request asks for other public methods, use the platform reference for `setLogLevel`, subscribe state methods, device ID lookup, click or foreground handlers, in-app action handlers, or web `setUserAttributes`.
   - `setUserAttributes` exists on mobile SDKs (Android, iOS, React Native, Flutter) from version `1.10.0+`, and on Web at any version. Use it when the installed SDK supports it; otherwise, or when the backend owns the authoritative profile data, use the server Track API. Confirm the method against the installed version instead of assuming either way.
   - Add `subscribe`, `unsubscribe`, click handlers, foreground handlers, in-app action handlers, service extensions, WebView bridge wiring, click-URL disabling, server send jobs, or advanced web loader patterns only when the platform or request requires them.
   - Do not preemptively add extra abstractions, fallback flows, instrumentation, caching, retries, feature flags, or refactors that were not requested.
   - Do not refactor unrelated code.

6. Verify from both code paths and FlareLane behavior.
   - Confirm initialization runs once.
   - Confirm a device can register.
   - Confirm user ID, tags, and events change as expected.
   - Confirm reused values from other analytics tools still come from authoritative repo state and do not duplicate FlareLane defaults or vendor-reserved fields.
   - Confirm `displayInApp` is called from a realistic screen or action, not only from temporary debug code.
   - For server APIs, confirm tokens stay server-side, non-2xx responses are handled, and send retries are idempotent when the product can retry.
   - Use the checklist in [shared-surface](references/shared-surface.md) before finishing.

7. Review the work against this skill before finishing.
   - Check whether the diff is the smallest change that satisfies the request.
   - Check whether any new wrapper, file, or abstraction is justified by existing architecture or real duplication.
   - Check whether FlareLane code was placed in the correct lifecycle or integration point for the platform.
   - Check whether the change added only the requested surface, without speculative extras.
   - Check whether the verification covers the requested product behavior, not only compile success.
   - If the task is a review, use these checks as the rubric and call out which rules were met or violated.
   - If any answer is "no", simplify the change before finalizing.

## Decision Points

### Permission timing

- `requestPermissionOnLaunch = true`
  - Pros: fastest path and easy smoke test.
  - Cons: can hurt opt-in rate if shown before the user has context.
- `requestPermissionOnLaunch = false`
  - Pros: lets the product ask later at a meaningful moment.
  - Cons: requires one more deliberate subscription trigger in the app flow.

### Wrapper vs direct calls

- Thin wrapper or service
  - Pros: elegant change surface, easier testing, SDK upgrades stay localized.
  - Cons: one extra file or abstraction.
- Direct calls at an existing integration point
  - Pros: smaller diff in very small apps.
  - Cons: logic is easier to duplicate across screens or handlers.

## Terms

- Service Worker: a background JavaScript file that enables web push in the browser.
- Notification Service Extension: an iOS extension that can modify incoming pushes, commonly needed for rich media.
- Bridge: the layer that lets JavaScript or Dart call native iOS/Android code.
- App Group: shared iOS storage used by the main app and its extension.

## Platform Notes

### Web

Read [web reference](references/web.md). Prefer the CDN script tag plus root `sw.js`, initialize exactly once, and only add `defer` or `beacon` patterns when the product flow actually benefits from them.

### Android

Read [Android reference](references/android.md). Initialize in `Application.onCreate`, not inside an `Activity`.

### iOS

Read [iOS reference](references/ios.md). Expect AppDelegate work plus notification capabilities and, for rich media, a Notification Service Extension.

### React Native

Read [React Native reference](references/react-native.md). Treat RN as two layers: JS API surface plus native Android/iOS setup underneath.

### Flutter

Read [Flutter reference](references/flutter.md). Initialize after `WidgetsFlutterBinding.ensureInitialized()`, then verify native iOS/Android pieces.

### Server API

Read [server API reference](references/server-api.md). Keep the project token in server-side secrets only, use a small API client or service, and call Track or Send APIs from backend-owned flows rather than client code.

## Finish

In the final response, summarize:

- where FlareLane was initialized
- where the public SDK methods or server API calls are made from
- which existing analytics values were reused, renamed, or intentionally ignored
- what questions were answered during integration
- how to verify device registration, tags, events, in-app display, and server API delivery when applicable
- how the final change stayed minimal and whether it passed the skill review checklist
