# Data Modeling

Use this file when wiring `setUserId`, `setTags`, `trackEvent`, user attributes, segmentation, personalization, or automation data.

Official docs, authoritative when this file is stale or silent: [data best practices](https://flarelane.com/ko/docs/data-integrations/data-best-practices), [events](https://flarelane.com/ko/docs/data-integrations/events), [user profile and tags](https://flarelane.com/ko/docs/data-integrations/user-attributes-tags), [user ID](https://flarelane.com/ko/docs/data-integrations/user-id). English: swap `/ko/` for `/en/`.

For backend API calls, also read [server-api](server-api.md).

## Source of truth

- Do not treat FlareLane as the product's primary database.
- Keep important customer data in the product backend, then sync the subset FlareLane needs for messaging, segmentation, and personalization.
- Prefer the server Track API when the backend has authoritative data or when the event must be independent of app version.
- Use SDK calls when the value changes only in the client, the action happens only in the app or browser, or the product needs immediate client-side targeting.
- For large backfills or periodic reconciliation, use the server Track API instead of client SDK loops.

## Recommended data coverage

Aim for useful coverage on the first pass rather than the literal minimum, and wire the whole set without a proposal round (see "Recommended surface" in [shared-surface](shared-surface.md)):

- Sync **every supported user-attribute field the product actually holds**, not just the one the request mentioned. FlareLane interprets these natively for targeting, personalization, and email/SMS delivery; official guidance is to sync as many as possible, and route everything else to tags.
- Do **both** sync modes: change-triggered updates *and* a one-time bulk sync of existing users through the server Track API. Change-triggered alone leaves every current user invisible until their next session, so day-one campaigns reach only a fraction of the base.
  - Write the backfill as a runnable script or job and hand it over — do not execute it against production data yourself. It reads the customer's user table and pushes personal data to a third party at scale, so the customer runs it when they are ready. Say how to dry-run it, how it batches (100 items per Track payload), and how it resumes.
- Include marketing consent state as a tag, so promotional and transactional sends can be separated inside FlareLane.
- Wire a few real product events rather than none, so journeys and conversion analytics have something to run on. Start small and grow.
- Prefer the server Track API for anything the backend already owns: it changes without an app release and covers users who never open the app.
- Ask the user to define the synced events and tags in the console's customer-data page, so marketers see meaningful names instead of raw keys.

## Reuse existing analytics mappings

- Inspect existing analytics wrappers, identify flows, user-property sync, and event payload builders before adding FlareLane modeling.
- Reuse stable business values already sent to other analytics tools when the underlying repo source is still authoritative and FlareLane supports the same meaning.
- Prefer domain-service inputs, shared payload builders, or wrapper arguments over vendor-shaped payload objects that may already be transformed.
- Keep the business meaning even if the final FlareLane key name changes to match the repo's naming style or FlareLane's supported surface.
- Do not copy vendor-reserved keys, automatically collected device or app fields, debug or experiment-only values, campaign transport metadata, secrets, or unsupported nested blobs just because another tool collects them.
- If one wrapper already fans out to multiple analytics providers, add FlareLane there instead of creating a second event path that can drift.

## User ID

- Use `setUserId` when auth state becomes authoritative: login success, signup completion, account switch, or logout.
- On logout or account switch, clear or replace the user ID so the next user on a shared device does not inherit the previous identity and receive their messages. Use the platform's supported clearing mechanism (passing `null`/empty where the SDK accepts it, or `resetDevice` to fully detach the device) rather than guessing a call.
- Prefer the same stable user ID that the product backend uses.
- Never use mutable or PII values such as email, phone number, nickname, or display name as the user ID — including when the product currently keys users on email. If there is no stable non-PII identifier, derive or generate an opaque stable one instead; otherwise identity fragments when the value changes, and the ID itself becomes PII that flows into Send API `targetIds`.
- Wire `setUserId` before user-scoped tags, user attributes, or events that should attach to the authenticated user.

## User attributes

User attributes are structured user profile fields with agreed meanings. Use them for profile data that FlareLane can interpret consistently.

Supported profile fields:

| Field         | Use for       | Format guidance                            |
| ------------- | ------------- | ------------------------------------------ |
| `email`       | email address | unique across users                        |
| `phoneNumber` | phone number  | E.164, for example `+821011112222`         |
| `dob`         | birthday      | `yyyy-mm-dd`, for example `1992-03-01`     |
| `timeZone`    | time zone     | TZ database name, for example `Asia/Seoul` |
| `name`        | name          | product-defined string                     |
| `country`     | country       | ISO 3166-1 alpha-2, for example `KR`       |
| `language`    | language      | ISO 639-1, for example `ko`                |

Platform rules:

- Web SDK: use `setUserAttributes(attributes, useBeacon?)` after `setUserId` and after the profile fields are stable.
- Android, iOS, React Native, and Flutter: a client `setUserAttributes` method exists in SDK `1.10.0+`; use it after `setUserId` when the installed version supports it. On older versions, or when the backend is the authoritative owner of the profile fields, sync through the [server Track API](server-api.md). Verify against the installed version before relying on the client method.
- Email and phone number must not be duplicated across different users.
- If a field is free-form, product-specific, or not in the supported profile list, model it as a tag instead of a user attribute — with one hard exception: never route regulated or sensitive PII (government IDs, national ID, passport, precise address or geolocation, health/medical, biometric, gender, or similar) into tags or event data. Those do not belong in FlareLane at all.
- If another analytics tool already syncs supported profile fields, reuse those same authoritative source fields instead of scraping a second profile source.

## Tags

Tags are free-form data for segmentation and personalization.

Good tag candidates:

- marketing consent state such as ad message opt-in
- lifecycle status such as plan, level, membership tier, or onboarding step
- commerce values such as order count, last purchase time, remaining points, coupon names, or liked product IDs
- product preferences such as favorite category, locale preference, or notification topic
- computed backend traits such as churn risk, VIP flag, or last active cohort

Timing:

- Set tags after the underlying profile, consent, plan, or preference value becomes stable.
- Re-sync tags when those values change, not on every render or every screen view.
- Prefer backend batch or periodic sync for data that originates in the backend.
- Use SDK `setTags` for client-only state changes or immediate targeting needs.
- Existing analytics traits or user properties can become FlareLane tags when they are stable, segmentation-worthy, and not better modeled as supported user attributes or FlareLane defaults.

Data types:

- string
- number
- boolean (accepted, but stored as the string `"true"` or `"false"`, so segment on the string value)
- time as an ISO-8601 string with timezone, for example `2024-04-19T14:23:56+09:00`
- time as a millisecond Unix timestamp, for example `1681721331085`
- array with a single value type, all strings or all numbers, max 100 elements
- `null` to delete an existing tag value

Keys containing `.` or `\` are silently dropped, and nested objects are not supported. These constraints are enforced server-side for both tags and event data.

Avoid:

- arrays of objects unless the current API explicitly supports them
- mixed-type arrays such as `["a", 1]`
- constantly changing debug values
- sensitive secrets, raw credentials, or payment data
- regulated or sensitive PII: government IDs, precise address/geolocation, health, biometric, or gender data
- huge payloads that would be better represented as a small computed trait
- sending `null` for a field that is merely unset — that deletes the tag. Omit the tag instead, and send `null` only when deletion is genuinely intended.

Device-specific tags:

- Prefer user-level tag consistency when `setUserId` is used.
- If a tag must stay device-specific, prefix the key with `@device_` (with the trailing underscore) so user-ID tag migration policy does not apply. Keys without that prefix sync up to the user.

## Events

Events are user actions such as add-to-cart, purchase, subscription start, tutorial completion, or feature use.

Timing:

- Track events at the moment the action actually succeeds.
- Prefer server Track API when the backend owns the action result, for example purchase, payment, subscription, refund, or shipment.
- Use SDK `trackEvent` when the event is purely client-side or needs immediate client-side automation.
- Do not fire events before optimistic UI has been confirmed by the backend if the backend can still reject the action.
- Do not track events from temporary debug buttons.
- Existing analytics event builders are often the best insertion point for FlareLane when they already represent the same business success moment.

Recommended event payloads:

- stable identifiers such as `productId`, `orderId`, `campaignId`, or `contentId`
- display fields useful for message personalization, such as `productName`
- numeric values such as `amount`, `quantity`, or `discount`
- time values with the same format rules as tags
- boolean flags that matter for segmentation or automation

Data types (same rules as tags):

- string
- number
- boolean (stored as the string `"true"` or `"false"`)
- time as an ISO-8601 string with timezone
- time as a millisecond Unix timestamp
- array with a single value type, all strings or all numbers, max 100 elements

Each event is capped at about 30 KB, and the server Track endpoint accepts at most 100 events per request.

Automatically collected events (reserved, `@`-prefixed):

- `@first_session`
- `@clicked`
- `@iam_displayed`
- `@iam_clicked`
- `@iam_closed`
- `@background_received`
- `@foreground_received`

Use custom event names for product-specific behavior. Never prefix a custom event name with `@` or reuse a reserved name.

## Modeling choice

- Use `setUserId` for identity.
- Use user attributes for supported profile fields: email, phone number, birthday, `timeZone`, name, country, and language.
- Use tags for current state, traits, preferences, consent, and values used in segments or personalized message variables.
- Use events for actions that happened at a point in time and can trigger journeys or behavior-based segments.
- Use the server Track API for authoritative backend facts, bulk imports, and periodic reconciliation.
- Use SDK methods for client-only facts or immediate client-side interaction flows.
