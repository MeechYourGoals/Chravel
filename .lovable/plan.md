

# Trip Pass Implementation Plan

## Overview

Add time-limited "Trip Pass" purchases alongside existing subscriptions, giving users a commitment-free way to access premium features for a single trip window.

**SKUs:**
- Explorer Trip Pass (45 days): $29.99 one-time
- Frequent Chraveler Trip Pass (90 days): $74.99 one-time

## Phase 1: Create Stripe Products

Create 2 new one-time Stripe products/prices using the Stripe tools:
- "Explorer Trip Pass (45 days)" -- $29.99 one-time
- "Frequent Chraveler Trip Pass (90 days)" -- $74.99 one-time

These will produce real `price_` and `prod_` IDs to embed in the codebase.

## Phase 2: Database -- Add `purchase_type` to `user_entitlements`

**Migration:**
```sql
ALTER TABLE user_entitlements
  ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'subscription'
    CHECK (purchase_type IN ('subscription', 'pass'));
```

No new table needed. The existing `user_entitlements` table already has `plan`, `status`, `current_period_end`, and `source` columns. Adding `purchase_type` distinguishes passes from subscriptions. The `current_period_end` column serves as `expires_at`.

## Phase 3: Update `create-checkout` Edge Function

Add Trip Pass support alongside existing subscription checkout:
- Accept `purchase_type: 'pass'` in the request body
- When `purchase_type === 'pass'`, use `mode: 'payment'` (one-time) instead of `mode: 'subscription'`
- Include `metadata.purchase_type`, `metadata.duration_days`, and `metadata.entitlement` on the session
- Map the new Trip Pass price IDs into the existing `PRICE_IDS` lookup

## Phase 4: Update `stripe-webhook` Edge Function

Add handler for `checkout.session.completed` with `purchase_type === 'pass'`:
- Read `duration_days` from session metadata (45 or 90)
- Compute `expires_at = max(existing_expires_at, now()) + duration_days`
- Upsert `user_entitlements` with `purchase_type = 'pass'`, computed `current_period_end`, and the correct `plan`
- Handle `charge.refunded` by setting `status = 'expired'` and `current_period_end = now()`

Existing subscription webhook logic remains untouched.

## Phase 5: Update `check-subscription` Edge Function

After checking for active Stripe subscriptions, also check `user_entitlements` for active passes:
- If no active subscription found, query `user_entitlements` for rows where `purchase_type = 'pass'`, `status = 'active'`, and `current_period_end > now()`
- Return the pass tier and expiry if found
- This ensures the client always gets the highest active entitlement (subscription wins over pass if both exist)

## Phase 6: Update `billing/config.ts` and `billing/types.ts`

- Add Trip Pass product configs to `BILLING_PRODUCTS` with the real Stripe IDs
- Add `'pass'` as a valid purchase type
- Add `PurchaseType` type: `'subscription' | 'pass'`
- Map pass product IDs to tiers in `PRODUCT_TO_TIER`

## Phase 7: Update `entitlementsStore.ts`

- When refreshing entitlements, store `purchase_type` from the `user_entitlements` row
- Expose `purchaseType` and `daysRemaining` computed values for the UI to show "X days left" banners

## Phase 8: Pricing UI -- Trip Pass Modal

Update `PricingSection.tsx`:
- Below the Monthly/Annual toggle, add a line: "Only need ChravelApp for a trip or two? Get a Trip Pass."
- Clicking opens a modal with two cards:
  - Explorer Trip Pass: 45 days, $29.99, key features listed
  - Frequent Chraveler Trip Pass: 90 days, $74.99, key features listed
- Each card has a "Get Trip Pass" button that calls `create-checkout` with `purchase_type: 'pass'`
- Add a line under each consumer card:
  - Explorer: "Going on a single trip? Get a 45-day Trip Pass for $29.99 and unlock premium features"
  - Frequent: "Multiples Trips in a short time span? Get a 90-day Trip Pass for $74.99"
- Add "Most people choose Annual" nudge text

Also add a FAQ entry:
- "What is a Trip Pass?" -- explains time-limited premium access with no commitment

## Phase 9: In-App Pass Status Banner

- When `purchaseType === 'pass'` and `currentPeriodEnd` exists, show a subtle banner: "Trip Pass active -- X days left"
- When expired: switch to read-only lock state with "Reactivate" CTA
- Three upsell trigger points (future iteration, not in this build):
  1. Creating a new trip while on Free
  2. Attempting PDF export from Free
  3. Pass expiration

## Phase 10: RevenueCat Alignment (Web-First Strategy)

Per the brainstorm, ship Trip Pass on web (Stripe) first. RevenueCat mobile passes are deferred to a future build because 45/90-day durations are not native App Store subscription periods and would require non-renewing subscription configuration plus App Review considerations.

The existing `sync-revenuecat-entitlement` function already handles `purchase_type` logic via the `user_entitlements` table, so when mobile passes are added later, the backend is already compatible.

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User buys pass twice | `expires_at = max(current_expires_at, now()) + duration_days` |
| User has subscription + buys pass | Subscription takes priority (higher or equal tier); pass extends if higher tier |
| Refund/chargeback | `status = 'expired'`, `current_period_end = now()` |
| Pass expires naturally | Cron or on-read check sets `status = 'expired'`; UI shows "Reactivate" |
| Cross-platform (future) | Same `user_entitlements` table, RC webhook will write to same row |

## Files Changed Summary

| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Add pass mode, pass price IDs, metadata |
| `supabase/functions/stripe-webhook/index.ts` | Handle pass checkout completion and refunds |
| `supabase/functions/check-subscription/index.ts` | Fall back to pass check when no subscription |
| `src/billing/config.ts` | Add Trip Pass product configs |
| `src/billing/types.ts` | Add `PurchaseType` type |
| `src/stores/entitlementsStore.ts` | Store and expose `purchaseType`, `daysRemaining` |
| `src/components/conversion/PricingSection.tsx` | Trip Pass link, modal, card add-on lines, FAQ |
| DB migration | Add `purchase_type` column to `user_entitlements` |

## What is NOT in Scope

- Mobile Trip Pass via RevenueCat (deferred -- web-first per strategy)
- AI credit metering per pass (future iteration)
- In-app upsell trigger points (future iteration)
- `billing_entitlements` separate table (unnecessary -- existing `user_entitlements` table covers all needs)

