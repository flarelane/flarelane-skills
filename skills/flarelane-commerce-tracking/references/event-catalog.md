# Event Catalog

FlareLane does not enforce a fixed set of event names — every `trackEvent` type is a free-form string and the server applies no name-based special handling. This skill deliberately fills that gap with a validated default taxonomy: the commerce "standard events" that ad platforms such as Meta Pixel use. Choose the path that matches the repo:

- **Zero-base repo (no existing commerce instrumentation): this is the primary case for this skill.** Confidently apply the recommended event set and payload conventions below as the default plan for every commerce flow that exists in the repo. Do not make the customer design their own taxonomy — these names are the proven, portable convention, and they carry over cleanly if the product later adds Meta Pixel or a similar tool.
- **Repo already emits commerce events to another analytics or ad tool:** reuse those existing event names and payload shapes at the same dispatch point instead, so the stack stays consistent.

Regardless of path:

- Keep casing consistent. FlareLane stores the `type` verbatim, so `Purchase` and `purchase` are different events.
- The payloads below are the recommended shape, not FlareLane requirements. For events whose payload is `none`, do not invent extra keys by default.
- Never use the reserved `@` prefix for custom event names (see Reserved event names below).

## Standard commerce events

The amounts in the payload column (`0.00`, `predicted_ltv: "0.00"`) are illustrative placeholders — never emit them literally. Replace with the real value from the codebase, or do not wire the event.

| Event code             | Trigger after this succeeds                                                                  | Preferred owner                                    | Suggested payload                                           |
| ---------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| `AddPaymentInfo`       | customer adds or confirms payment info during checkout                                       | SDK or backend, depending on checkout architecture | none                                                        |
| `AddToCart`            | product is added to the cart                                                                 | SDK by default                                     | none                                                        |
| `AddToWishlist`        | product is added to wishlist or favorites                                                    | SDK by default                                     | none                                                        |
| `CompleteRegistration` | signup or required profile completion succeeds                                               | SDK or backend                                     | none                                                        |
| `Contact`              | user successfully contacts the business by form, email intent, chat handoff, or call request | SDK or backend                                     | none                                                        |
| `CustomizeProduct`     | product customization is saved or confirmed                                                  | SDK by default                                     | none                                                        |
| `Donate`               | donation payment succeeds                                                                    | backend preferred                                  | none                                                        |
| `FindLocation`         | store or branch finder action succeeds                                                       | SDK by default                                     | none                                                        |
| `InitiateCheckout`     | checkout process starts after cart validation                                                | SDK or backend                                     | none                                                        |
| `Lead`                 | user submits contact info for later follow-up                                                | SDK or backend                                     | none                                                        |
| `Purchase`             | order is accepted, paid, or confirmed on the thank-you path                                  | backend preferred                                  | `{ value: 0.00, currency: "USD" }`                          |
| `Schedule`             | booking, consultation, or visit reservation succeeds                                         | SDK or backend                                     | none                                                        |
| `Search`               | site or app search completes and results are shown                                           | SDK by default                                     | none                                                        |
| `StartTrial`           | free trial is activated                                                                      | backend preferred                                  | `{ value: "0.00", currency: "USD", predicted_ltv: "0.00" }` |
| `SubmitApplication`    | application form submission succeeds                                                         | SDK or backend                                     | none                                                        |
| `Subscribe`            | paid subscription or recurring service starts                                                | backend preferred                                  | `{ value: "0.00", currency: "USD", predicted_ltv: "0.00" }` |
| `ViewContent`          | product detail, landing page, or content page is actually viewed                             | SDK by default                                     | none                                                        |

## Placement notes

- `Purchase`: send only after the backend has accepted the order or payment. A thank-you page is acceptable only when it appears after confirmed completion.
- `StartTrial`: send after the trial entitlement is active, not when the user merely opens the pricing page.
- `Subscribe`: send after the paid subscription is created or renewed according to the product's business rule.
- `AddPaymentInfo`: send after payment details are saved, tokenized, or the checkout step is confirmed.
- `InitiateCheckout`: send when the checkout flow truly begins, not when the user just opens the cart drawer.
- `Search`: send after a real query returns or renders results, not on every keypress.
- `ViewContent`: use a stable route or content-load success point, not a temporary placeholder render.

## Revenue and conversion data

FlareLane attributes purchase revenue through a per-project purchase-conversion setting configured in the Console, not through a fixed event schema. That setting names which event `type` counts as a purchase and which data keys hold the price, quantity, and currency (amount is computed as price times quantity). So for revenue attribution to work:

- Send the purchase event with a numeric amount, and a quantity when relevant, under stable data keys from the codebase. FlareLane's own examples use `amount`; Meta-style integrations use `value`. Match whatever the repo already produces rather than forcing a name.
- Point the Console purchase-conversion config's price key, quantity key, and currency at those same fields. Call this out as a required Console step; the tracking code alone does not enable revenue attribution.
- Amounts may be a number or a numeric string; FlareLane coerces them, so the number-vs-string distinction does not matter.
- There is no server-side `predicted_ltv` handling. Treat `predicted_ltv` as an optional ad-platform convention only, and do not invent a lifetime-value number.
- If the product transacts in multiple currencies, use the currency attached to the actual transaction and confirm how the Console config expects currency to be supplied.

## Event data constraints

These are enforced by the FlareLane server for both event `data` and tags:

- Value types: string, number, `string[]` or `number[]` (arrays must be a single type, max 100 elements), and `null`. Booleans are accepted but stored as the strings `"true"`/`"false"`. Nested objects are not supported.
- Keys containing `.` or `\` are silently dropped.
- Each event is capped at about 30 KB; the server Track endpoint accepts at most 100 events, 100 tags, and 100 user attributes per request.

## Reserved event names

FlareLane auto-collects reserved events whose names begin with `@`: `@first_session`, `@clicked`, `@iam_displayed`, `@iam_clicked`, `@iam_closed` (and the reserved `@background_received`, `@foreground_received`). Never emit a custom event with an `@` prefix or reuse these names.

## Common source files

Look for event success points in:

- cart stores, reducers, hooks, or service methods
- wishlist or favorites services
- checkout controllers, coordinators, view models, or route actions
- payment method setup modules
- order confirmation pages, webhook handlers, or payment callbacks
- signup completion handlers
- CRM, lead, contact, or application submission modules
- subscription billing services, plan-change handlers, or entitlement workers
- search result pages or search service responses
- product detail pages, CMS landing pages, or store finder pages

## Avoid

- Do not fire `Purchase`, `StartTrial`, or `Subscribe` before the backend accepts them.
- Do not add placeholder `0.00` values into production code. Use real values from the codebase.
- Do not attach random extra fields to events whose payload the convention here lists as `none`.
- Pick exactly one owner (client OR server) per event type. FlareLane does not deduplicate client vs server events for you — a client `trackEvent` carries no idempotency key, and another tool's dedup (Segment/Amplitude `messageId`) does not apply to FlareLane. Emitting the same event from both sides double-counts conversions and revenue.
