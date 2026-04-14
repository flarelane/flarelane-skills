# Server API Integration

Use this file when adding backend calls to FlareLane Track or Send APIs.

Server API is not a client SDK public method surface. It belongs in backend services, API clients, jobs, or workers, never in browser, mobile, React Native JS bundles, or Flutter client code.

## Credentials

- Base URL: `https://api.flarelane.com`
- Project ID: path parameter `PROJECT_ID`
- Project token: FlareLane Console project token
- Auth header: `Authorization: Bearer <PROJECT_TOKEN>`
- Optional idempotency header: `Idempotency-Key: <stable-request-key>`
- Store credentials in server-side secrets such as `FLARELANE_PROJECT_ID` and `FLARELANE_PROJECT_TOKEN`.
- Do not commit tokens, print tokens in logs, send tokens to clients, or expose them through public config endpoints.

`Idempotency-Key` means a stable key that lets a retried request avoid duplicate side effects. Use it for send operations and any Track retry path where duplicated events, tags, or user attribute updates would be harmful.

## Common Target Files

- backend env schema or config module
- shared HTTP client or integration client
- notification, messaging, lifecycle, or analytics service
- queue, worker, scheduled job, or webhook handler
- retry, error handling, and observability utilities
- unit tests for payload shape and auth handling

## API Surface

| Goal                                | Method and path                                | Rate limit      | Required core fields                                            |
| ----------------------------------- | ---------------------------------------------- | --------------- | --------------------------------------------------------------- |
| Track events, tags, user attributes | `POST /v1/projects/{PROJECT_ID}/track`         | 100 req / 1 sec | at least one of `events`, `tags`, or `userAttributes`           |
| Send push notification              | `POST /v1/projects/{PROJECT_ID}/notifications` | 5 req / 1 sec   | `targetType`, `targetIds`, and either `body` or `templateId`    |
| Send email                          | `POST /v1/projects/{PROJECT_ID}/emails`        | 5 req / 1 sec   | `targetType`, `targetIds`, `senderEmail`, `title`, `templateId` |
| Send SMS                            | `POST /v1/projects/{PROJECT_ID}/sms`           | 5 req / 1 sec   | `targetType`, `targetIds`, `isAdvertisement`, `body`            |
| Send Kakao Alimtalk                 | `POST /v1/projects/{PROJECT_ID}/alimtalk`      | 5 req / 1 sec   | `targetType`, `targetIds`, `templateId`                         |

## Track API

Use Track API for backend-owned identity, tags, events, user attributes, imports, and periodic reconciliation.

Payload groups:

- `events`: up to 100 items
- `tags`: up to 100 items
- `userAttributes`: up to 100 items

Event item:

```json
{
  "subjectType": "user",
  "subjectId": "user_123",
  "type": "purchase_completed",
  "data": {
    "orderId": "order_123",
    "amount": 49000
  }
}
```

Rules:

- `subjectType` is `user` or `device`.
- `subjectId` is the user ID when `subjectType` is `user`, or the FlareLane device ID when `subjectType` is `device`.
- `type` is the event name.
- `data` is optional event data. Send an object when writing a normal HTTP client; if a generated OpenAPI client models this field as a JSON string, stringify only at that generated-client boundary.

Tag item:

```json
{
  "subjectType": "user",
  "subjectId": "user_123",
  "tags": {
    "plan": "pro",
    "marketingOptIn": true
  }
}
```

Rules:

- `subjectType` is `user` or `device`.
- `subjectId` is the matching user ID or device ID.
- `tags` is an object of tag key-value pairs.
- Use `null` for a tag value only when the product intentionally deletes that tag.

User attribute item:

```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "phoneNumber": "+821011112222",
  "timeZone": "Asia/Seoul",
  "language": "ko",
  "country": "KR"
}
```

Rules:

- `userId` is required.
- Supported profile fields are `email`, `phoneNumber`, `dob`, `timeZone`, `name`, `country`, and `language`.
- `phoneNumber` uses E.164 format.
- `dob` uses `YYYY-MM-DD`.
- `timeZone` uses a TZ database name such as `Asia/Seoul`.
- `country` uses ISO 3166-1 alpha-2.
- `language` uses ISO 639-1.

## Send Push Notifications

Use for server-triggered push notifications.

Required:

- `targetType`: `userId`, `segment`, or `device`
- `targetIds`: max 100 for `userId`, max 5 for `segment`, max 100 for `device`
- `body` or `templateId`

Optional fields include `title`, `url`, `imageUrl`, `data`, `ignoreFrequencyCapping`, `ttl`, `flarelane_save_sent_history`, and `targetPlatforms`.

Use `url` for HTTPS web URLs or app deep links. Use `targetPlatforms` when a send must be limited to platforms such as `android`, `ios`, `webDesktop`, or `webMobile`.

## Send Email

Use for server-triggered email sends.

Required:

- `targetType`: `userId` or `email`
- `targetIds`: max 100
- `senderEmail`
- `title`
- `templateId`

Optional fields include `campaignName`, `data`, and `interpolations`.

## Send SMS

Use for server-triggered SMS sends.

Required:

- `targetType`: `userId` or `phoneNumber`
- `targetIds`: max 100; phone numbers must use E.164 format such as `+821011112222`
- `isAdvertisement`
- `body`: max 2000 bytes

Optional fields include `campaignName`, `title` with max 40 bytes, and `data`.

## Send Kakao Alimtalk

Use for server-triggered Kakao Alimtalk sends.

Required:

- `targetType`: `userId` or `phoneNumber`
- `targetIds`: max 100; phone numbers must use E.164 format such as `+821011112222`
- `templateId`

Optional fields include `interpolations`, `campaignName`, and `data`.

Interpolation example:

```json
{
  "#{회사명}": "플레어랩스"
}
```

## Timing and Location

- Track user attributes after the backend has stable profile fields.
- Track tags after backend-owned consent, plan, lifecycle, or computed traits change.
- Track events after the business action succeeds, such as payment capture, order creation, refund completion, shipment, or subscription change.
- Send push, email, SMS, or Alimtalk from backend-owned transactional flows, jobs, or workers.
- Do not call send APIs directly from client UI handlers. Instead call the product backend, then have the backend call FlareLane.
- Use queues for high-volume sends so rate limits and retries are controlled in one place.
- Add idempotency keys from product event IDs, job IDs, message IDs, or order IDs when a request can be retried.

## Implementation Shape

1. Add server-only config for `FLARELANE_PROJECT_ID` and `FLARELANE_PROJECT_TOKEN`.
2. Add or extend a thin FlareLane API client around the product's existing HTTP client.
3. Centralize auth headers, base URL, timeout, non-2xx handling, and safe logging in that client.
4. Add typed request builders or schemas for the requested Track or Send operation.
5. Call the API client from the existing domain service, job, worker, or webhook handler.
6. Gate marketing-like sends behind the product's consent model.
7. Add tests for payload shape, auth header injection without exposing the token, error handling, and retry/idempotency behavior.

## Questions That Actually Matter

- Which environment's `projectId` should this backend use?
- What server-side secret name should hold the project token?
- Which operation is needed: Track, push, email, SMS, or Kakao Alimtalk?
- Which target type and target IDs should the backend use?
- Which template ID, sender email, message body, or interpolation keys are required?
- Which consent or subscription check must pass before sending?
- Which product ID should become the `Idempotency-Key`?
- Should failed sends retry, dead-letter, or surface an error to the caller?

## Caution Points

- Do not expose `FLARELANE_PROJECT_TOKEN` in frontend, mobile, React Native JS, Flutter client code, logs, crash reports, or source maps.
- Do not send marketing or advertising messages without checking the product's consent state.
- Do not loop large send batches synchronously inside a request handler; use a queue or job.
- Do not rely on UI-generated timestamps for backend-owned events when the backend has the authoritative time.
- Do not duplicate sends on retry; use `Idempotency-Key` for retryable operations.
- Do not silently swallow non-2xx responses; record enough context to debug without logging secrets or full PII payloads.

## Verification

- Confirm the backend loads `projectId` and token from server-side config only.
- Confirm requests include `Authorization: Bearer <token>` and never expose the token in logs.
- Confirm payloads respect max target counts and required fields for the chosen API.
- Confirm rate-limit behavior is controlled by a queue, throttle, or retry policy when needed.
- Confirm non-2xx responses are handled and observable.
- Confirm idempotency works for retryable sends.
- Confirm Track API updates arrive for events, tags, and user attributes when used.
- Confirm Send API requests create the expected push, email, SMS, or Alimtalk delivery in the intended environment.
