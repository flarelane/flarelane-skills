# Tag Strategy

Choose tags from real, stable commerce data. Target about 10 to 15 tags when the repo supports them.

For a zero-base repo, treat the strong tag candidates below as the recommended default set and wire every one the repo can source from stable state. When the repo already syncs customer traits to another analytics tool, reuse those authoritative fields instead of inventing parallel keys.

## Never duplicate these fields as tags

Supported user attributes:

- `email`
- `phoneNumber`
- `dob`
- `timeZone`
- `name`
- `country`
- `language`

FlareLane device defaults (auto-collected at device registration):

- `platform`
- `deviceModel`
- `osVersion`
- `appVersion`
- `sdkType`
- `sdkVersion`
- `languageCode`
- `countryCode`
- `timeZone`
- `pushToken`
- `browser` (web only)
- `browserVersion` (web only)
- `apsEnvironment` (iOS only)

If a field is already covered above, do not send it again as a tag.

## Selection order

1. Prefer stable customer lifecycle and loyalty fields.
2. Then prefer stable commerce state such as cart, coupon, order, and subscription state.
3. Then prefer stable preference fields such as category, brand, store, payment, and fulfillment preference.
4. Use device-specific tags only when the value is not already covered by FlareLane defaults and truly differs by device.

## Reuse existing analytics traits carefully

- If the repo already syncs stable customer traits to another analytics tool, those traits can be strong FlareLane tag candidates when the business meaning matches.
- Prefer shared trait builders, backend summaries, or domain models over vendor-specific payload objects.
- Keep the same product meaning even if you rename the final tag key to match the repo's naming style.
- Do not mirror vendor-reserved keys, auto-collected device fields, raw campaign transport parameters, experiment-only flags, or large nested blobs just because another tool stores them.

## Strong tag candidates

| Tag key example           | Why it is useful                              | Typical source                          |
| ------------------------- | --------------------------------------------- | --------------------------------------- |
| `membershipTier`          | segments premium vs standard customers        | profile or loyalty state                |
| `loyaltyPoints`           | supports rewards and reminder campaigns       | loyalty service or account summary      |
| `availableCouponCount`    | helps coupon reminder targeting               | coupon wallet or promotions API         |
| `hasAvailableCoupon`      | simple boolean segmentation                   | coupon wallet or promotions API         |
| `wishlistCount`           | identifies high-intent shoppers               | wishlist store or favorites API         |
| `cartItemCount`           | supports cart-abandonment or bundle messaging | cart store or backend cart summary      |
| `cartSubtotal`            | segments by current cart value                | cart summary or checkout state          |
| `totalOrderCount`         | separates repeat buyers from new customers    | order history summary                   |
| `lastPurchaseAt`          | supports reorder or win-back timing           | order history or CRM summary            |
| `averageOrderValue`       | segments by typical spend                     | analytics summary or account service    |
| `lifetimeValue`           | prioritizes high-value customer messaging     | CRM or customer summary                 |
| `subscriptionStatus`      | separates active, paused, canceled, or none   | subscription service                    |
| `subscriptionPlan`        | helps plan-aware targeting                    | billing or entitlement service          |
| `trialEligible`           | targets trial upsell or onboarding            | subscription or offer service           |
| `recentOrderStatus`       | supports post-purchase messaging              | latest order summary                    |
| `preferredCategory`       | helps product recommendation targeting        | browse history summary or profile model |
| `preferredBrand`          | helps brand-focused campaigns                 | profile or recommendation model         |
| `preferredPaymentMethod`  | helps checkout recovery flows                 | payment preference or recent order data |
| `preferredShippingMethod` | helps fulfillment messaging                   | checkout preference or order history    |
| `preferredStoreId`        | helps local inventory or store campaigns      | store picker or account preference      |
| `isVip`                   | simplifies premium targeting                  | CRM flag or loyalty segmentation        |
| `churnRisk`               | supports retention journeys                   | lifecycle model or CRM scoring          |

## Device-specific examples

Use these only when they exist in the repo and are not covered by FlareLane defaults:

- `@device_PushPermissionState`
- `@device_AppVersion`
- `@device_InstallSource`
- `@device_LastSeenStoreId`

## Avoid noisy tags

- raw email, phone number, name, country, language, or time zone
- browser or OS data already collected by FlareLane
- current search keyword
- current product ID unless the product deliberately treats it as a stable preference
- full cart line items or huge arrays
- payment tokens, card details, secrets, or raw credentials
- regulated or sensitive PII: government/national IDs, passport numbers, precise address or geolocation, health, biometric, or gender data (these do not belong in FlareLane at all)
- rapidly changing debug values or timestamps with no segmentation value

## Rules

- Prefer tags that change only when the underlying business state changes.
- Re-sync tags on actual state changes, not on every render.
- Match the target repo's existing key style. If the repo has no clear style, prefer camelCase.
- Use the backend as the source of truth for order, spend, subscription, and loyalty data when possible.
- When reusing another analytics tool's traits, keep only the fields that still have clear segmentation or personalization value in FlareLane.
- If the repo cannot justify at least 10 stable tags, explain which source data is missing instead of padding the set with low-quality values.
