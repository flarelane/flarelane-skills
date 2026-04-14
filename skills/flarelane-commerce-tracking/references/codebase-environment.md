# Codebase Environment

Read this file first. The goal is to understand where the commerce truth lives before adding FlareLane calls.

## Inspection order

1. Detect the technical surface.
2. Detect the commerce flows that actually exist.
3. Detect the stable customer and order data sources.
4. Detect the existing analytics or integration layer, including identify, user-property, and event payload paths.
5. Detect whether FlareLane baseline setup already exists.

## Surface detection

| Surface      | Common signals                                                                                 | Common commerce files                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Web          | `package.json`, router files, `public/`, `src/main.*`, `src/app.*`, Next.js `app/` or `pages/` | product pages, search routes, cart store, checkout components, order confirmation pages                  |
| Android      | `app/build.gradle*`, `AndroidManifest.xml`, `Application`, Activity or Fragment classes        | cart and checkout screens, payment repository, order ViewModel                                           |
| iOS          | `Podfile`, `AppDelegate`, SceneDelegate, SwiftUI `App`, UIKit coordinators                     | product detail controllers, cart view controllers, checkout coordinators                                 |
| React Native | `react-native` dependency plus `android/` and `ios/`                                           | JS screens, stores, service modules, native setup                                                        |
| Flutter      | `pubspec.yaml`, `lib/main.dart`, `android/`, `ios/`                                            | screens, providers or blocs, repositories, router files                                                  |
| Backend      | API server, workers, queues, webhook handlers, billing modules                                 | checkout session creation, payment confirmation, order completion, subscription state, CRM or lead flows |

If the repo contains multiple surfaces, prefer the surface that owns the requested commerce fact. Example: browse events may belong in web or app code, while `Purchase` usually belongs in backend or post-order confirmation logic.

## Search patterns

Use `rg` first. Start with broad business terms, then narrow to implementation files.

Commerce flow discovery:

```bash
rg -n "product|catalog|pdp|plp|search|wishlist|cart|checkout|payment|order|purchase|subscription|trial|coupon|loyalty|store|contact|lead|appointment|application"
```

Customer and profile discovery:

```bash
rg -n "auth|login|signup|register|account|profile|customer|member|user"
```

Analytics and instrumentation discovery:

```bash
rg -n "analytics|track|event|pixel|gtag|segment|amplitude|mixpanel|posthog|identify|capture|logEvent|setUserProperties|people\\.set|dataLayer|braze|appsflyer|firebase"
```

FlareLane discovery:

```bash
rg -n "FlareLane|flarelane|initialize|setUserId|setTags|trackEvent|setUserAttributes|/track"
```

## What to extract from the repo

- Stable user ID source
- Supported user attributes already available in product state or backend data
- Cart, wishlist, checkout, order, subscription, and loyalty state sources
- Current currency and amount source for payments and orders
- Existing event wrapper or analytics adapter
- Existing event names, user traits, and tag-like values already shipped to other analytics tools
- The real success path for each commerce action
- Candidate tags that are stable enough to segment on
- Existing device-specific state that is not already covered by FlareLane defaults

## Commerce flow map

Look for these concrete success points:

- `ViewContent`: product detail page load, landing page load, CMS article load
- `Search`: search submission plus successful result rendering
- `AddToWishlist`: wishlist mutation success
- `AddToCart`: cart mutation success
- `InitiateCheckout`: checkout flow entry after the cart is accepted
- `AddPaymentInfo`: payment method entry or save success
- `Purchase`: order creation or payment confirmation success
- `CompleteRegistration`: account creation success
- `Lead`, `Contact`, `Schedule`, `SubmitApplication`: form or booking success
- `StartTrial`, `Subscribe`: billing or entitlement activation success
- `FindLocation`: store finder or direction intent success
- `Donate`: donation payment success
- `CustomizeProduct`: configurator completion or save success

## Baseline FlareLane check

Confirm whether the repo already has:

- SDK initialization
- user ID wiring
- tags wiring
- event wiring
- web `setUserAttributes`, if the surface is web
- backend Track API client, if the surface is backend or mobile user attributes are required

If any of the baseline pieces are missing, use the sibling [flarelane-sdk-integration](../flarelane-sdk-integration/SKILL.md) skill first.

## Minimal blocking questions

Ask only if the repo cannot answer them:

- What is the FlareLane `projectId` for this environment?
- Which server-side secret name should hold the FlareLane project token?
- Which currency should be treated as canonical if the product can transact in multiple currencies?
- Where should `predicted_ltv` come from for `StartTrial` or `Subscribe` if the repo does not already model it?
- If the repo has both an analytics wrapper and a domain service, which one should own the FlareLane dispatch?
- If the same business signal has different names across analytics tools, which contract should FlareLane follow?

## Rules

- Do not ask which platform the repo uses when the files already show it.
- Do not use temporary UI state as the source of truth for revenue or subscription facts.
- Do not add a second analytics abstraction if the repo already has one.
- Do not model unsupported profile fields as user attributes; use tags instead when they are stable and useful.
- Do not copy vendor-reserved keys or auto-collected analytics fields into FlareLane until you confirm they represent useful product data.
