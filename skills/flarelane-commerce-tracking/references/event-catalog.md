# Event Catalog

Use the exact event codes below. They are case-sensitive.

The payload examples describe the required keys and value shapes. Replace placeholder values with the real values from the codebase. For events whose payload is `none`, do not add extra keys by default.

## Standard commerce events

| Event code             | Trigger after this succeeds                                                                  | Preferred owner                                    | Required payload                                            |
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

## Data rules

- `Purchase.value` should use the actual order total that the product considers complete.
- `Purchase.currency` should use the real ISO currency code from the order or checkout context.
- `StartTrial.value` and `Subscribe.value` should follow the requested string shape even when the source data begins as a number.
- `predicted_ltv` means expected lifetime value. Use a stable business value if the repo has one; otherwise ask instead of inventing it.
- If the product uses multiple currencies, use the currency attached to the actual transaction or subscription.

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
- Do not attach random extra fields to events whose contract here says `none`.
- Do not emit the same event from both client and server unless the repo already deduplicates them.
