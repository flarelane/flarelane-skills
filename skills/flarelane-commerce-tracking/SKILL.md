---
name: flarelane-commerce-tracking
description: Model and integrate FlareLane commerce events, tags, and supported user attributes in existing storefront, app, or backend codebases. Use when Codex needs to audit a commerce codebase, detect product, cart, wishlist, checkout, order, subscription, or profile flows, ensure baseline FlareLane integration exists, then wire a recommended commerce event set such as AddToCart, InitiateCheckout, Purchase, StartTrial, Subscribe, and ViewContent (event names are free-form conventions, not a FlareLane built-in catalog), choose about 10 stable commerce tags without duplicating FlareLane device defaults or supported user attributes, and sync supported user attributes through the correct surface such as the Web SDK or server Track API.
---

# FlareLane Commerce Tracking

## Overview

Use this skill to add commerce-focused FlareLane tracking without guessing the product model or scattering SDK calls through random screens. Start by understanding the target codebase and the business flow, confirm FlareLane is already initialized, then wire only the standard commerce events, stable tags, and supported user attributes that truly exist in the repo. If the codebase already sends commerce events, user traits, or tag-like values to another analytics tool, inspect and reuse those stable business values when they match FlareLane semantics.

This skill focuses on commerce modeling and placement. For SDK bootstrap, lifecycle files, service workers, native setup, or raw server Track API wiring details, reuse the sibling [flarelane-sdk-integration](../flarelane-sdk-integration/SKILL.md) skill instead of re-inventing platform behavior here.

## Workflow

1. Inspect the codebase before editing.
   - Read [codebase-environment](references/codebase-environment.md).
   - Detect the product surface: web, Android, iOS, React Native, Flutter, backend, or a mixed repo.
   - Find the commerce flows that actually exist: product detail, listing, search, wishlist, cart, checkout, payment, order completion, registration, subscription, lead/contact, appointment, application, store locator, or donation.
   - Find the existing analytics abstraction, service layer, or event bus before adding direct FlareLane calls.
   - Inspect the event payloads, user-property sync, and tag-like values those existing tools already send before inventing new keys or payload shapes.

2. Confirm baseline FlareLane integration.
   - Search for `initialize`, `setUserId`, `setTags`, `trackEvent`, `setUserAttributes`, service worker setup, or a backend Track client.
   - If FlareLane bootstrap is missing or broken, use [flarelane-sdk-integration](../flarelane-sdk-integration/SKILL.md) first, then return to this skill.
   - Keep platform-specific SDK method behavior in the sibling skill so both skills stay consistent.

3. Load the right references.
   - First run the best-effort freshness check in the sibling [staying-current](../flarelane-sdk-integration/references/staying-current.md) so both the skill and the FlareLane SDK version stay up to date. It is non-blocking.
   - Always read [event-catalog](references/event-catalog.md).
   - Always read [tag-strategy](references/tag-strategy.md).
   - Read the sibling references [shared-surface](../flarelane-sdk-integration/references/shared-surface.md) and [data-modeling](../flarelane-sdk-integration/references/data-modeling.md).
   - Read exactly one sibling platform or API reference only when you need wiring details:
     - [web](../flarelane-sdk-integration/references/web.md)
     - [android](../flarelane-sdk-integration/references/android.md)
     - [ios](../flarelane-sdk-integration/references/ios.md)
     - [react-native](../flarelane-sdk-integration/references/react-native.md)
     - [flutter](../flarelane-sdk-integration/references/flutter.md)
     - [server-api](../flarelane-sdk-integration/references/server-api.md)

4. Decide the data owner before choosing SDK calls or Track API calls.
   - Prefer SDK `trackEvent` when the user action is confirmed in the client and immediate client-side automation matters.
   - Prefer the server Track API when the backend owns the final truth, especially for `Purchase`, `StartTrial`, `Subscribe`, and mobile user-attribute sync.
   - Preserve an existing analytics wrapper or domain service when one already exists.
   - When another analytics tool already dispatches the same business event or user trait, reuse the same authoritative source values instead of re-deriving them in UI code.
   - Do not fire the same commerce event from both client and server unless the codebase already has deduplication logic.

5. Identify the user and sync supported user attributes.
   - Use the product's stable backend user ID, not email or phone number, as the FlareLane user ID.
   - Sync only supported user attributes when the repo truly has them: `email`, `phoneNumber`, `dob`, `timeZone`, `name`, `country`, `language`.
   - If another analytics tool already has identify or user-property sync, reuse the same stable profile source fields when their meaning matches these supported attributes.
   - Do not duplicate supported user attributes as tags.
   - Do not duplicate FlareLane device default fields as tags.
   - On web, use `setUserAttributes`.
   - On Android, iOS, React Native, and Flutter, use `setUserAttributes` when the installed SDK is `1.10.0+`; otherwise, or when the backend owns the authoritative profile data, use the server Track API. Confirm against the installed version.

6. Choose stable commerce tags.
   - Use [tag-strategy](references/tag-strategy.md) to derive about 10 to 15 stable tags from the repo.
   - Prefer values that help segmentation and personalization: lifecycle, loyalty, subscription, cart state, coupon state, order history, preferred category, preferred store, payment preference, or fulfillment preference.
   - Prefer stable traits that the repo already syncs to other analytics tools when those traits are still backed by authoritative product state and are not better modeled as supported user attributes or FlareLane defaults.
   - Use fewer than 10 only when the codebase truly lacks stable fields; if so, explain the gap instead of padding with noisy data.
   - If a tag is truly device-specific, prefix the key with `@device_` (with the trailing underscore).

7. Wire the commerce events.
   - Event names are free-form in FlareLane, so this skill supplies a validated default. For a zero-base repo with no existing commerce instrumentation — the primary case — confidently apply the recommended event set and payload conventions in [event-catalog](references/event-catalog.md) as the default plan for every commerce flow that exists. If the repo already emits commerce events to another tool, reuse those existing names at the same dispatch point instead.
   - Keep event-name casing consistent, and never use the reserved `@` prefix.
   - Treat catalog payloads as the recommended shape, not FlareLane requirements. For events whose payload is `none`, do not invent extra keys by default.
   - For revenue attribution, send a numeric amount (and quantity when relevant) and flag that the Console purchase-conversion config must map those keys; see the event-catalog revenue notes.
   - Track each event only after the business action actually succeeds.
   - Prefer existing analytics dispatch points over screen-local duplicate handlers.
   - If an existing analytics wrapper already emits the same commerce event, add FlareLane at that dispatch point and reuse the same stable payload fields, but do not copy vendor-only metadata.

8. Verify the implementation from the real flow.
   - Confirm the code path that sets the user ID.
   - Confirm supported user attributes sync from the correct owner.
   - Confirm tags are sourced from stable state, not transient UI state.
   - Confirm each event is fired from a real success path.
   - Confirm reused analytics values still map to authoritative product state and not to vendor-reserved fields, temporary UI variables, or debug-only payloads.
   - Confirm `Purchase`, `StartTrial`, and `Subscribe` are not emitted optimistically before the backend accepts them.

## Decision Points

### SDK vs server Track API

- SDK calls
  - Pros: fastest for client-only interactions and immediate automation.
  - Cons: easier to lose accuracy when the backend can still reject the action.
- Server Track API
  - Pros: best for authoritative results such as completed orders or paid subscriptions.
  - Cons: requires backend-owned secrets and usually one more integration point.
- Hybrid split
  - Pros: keeps browse and intent events in the client while reserving authoritative commerce facts for the backend.
  - Cons: needs discipline so the same event is not sent twice.

### Analytics wrapper vs direct FlareLane call

- Existing analytics wrapper or domain service
  - Pros: keeps the change localized and consistent with the repo architecture.
  - Cons: requires reading one more abstraction before editing.
- Direct call at a verified success point
  - Pros: smaller diff in very small codebases.
  - Cons: easier to duplicate logic across screens or handlers.

## Terms

- Authoritative source: the system whose result is final, usually the backend for orders, payments, subscriptions, and membership state.
- Segmentation: grouping users by shared traits or behavior so messaging can target the right audience.
- LTV: lifetime value, meaning the expected total value a customer may generate over time.

## Finish

In the final response, summarize:

- which codebase surface and commerce flows were detected
- whether baseline FlareLane integration already existed or had to be added first
- where user ID, supported user attributes, tags, and each commerce event are wired
- which tag set was chosen and why those tags were stable enough
- which existing analytics values or traits were reused or intentionally excluded
- how to verify the main flows, especially `Purchase`, `StartTrial`, and `Subscribe`
