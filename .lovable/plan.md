
# Fix Trip Pass Pricing: Explorer $29.99 → $39.99

## Problem
Two Explorer Trip Passes ($29.99 × 2 = $59.98) are cheaper than one Frequent Chraveler Pass ($74.99), breaking bundle incentive. At $39.99, two Explorers = $79.98 > $74.99 Frequent, properly incentivizing the upgrade.

## Changes

### 1. `src/components/conversion/TripPassModal.tsx` — UI price + copy
- Line 21: `'$29.99'` → `'$39.99'`
- Line 33: nudge → `'Annual Explorer ($99/yr) pays for itself after ~3 trips'`
- Line 51: nudge → `'Annual Frequent ($199/yr) pays for itself after ~3 trips'`
- Line 148: footer already says "~3 trips" — keep as-is

### 2. `src/billing/config.ts` — Business logic price
- Line 206: `price: 29.99` → `price: 39.99`

### 3. Stripe — Create new Price for Explorer Trip Pass
- The existing Stripe Price `price_1Sz6A53EeswiMlDCF51s1XOi` is $29.99 — we must NOT edit it (breaks historical receipts)
- Create a NEW Stripe Price on product `prod_Tx0AZIWAubAWD3` at $39.99 one-time
- Update the Price ID in:
  - `src/billing/config.ts` line 203 (`stripePriceId`)
  - `supabase/functions/create-checkout/index.ts` line 38

### 4. RevenueCat — Update product price
- RevenueCat product `com.chravel.explorer.pass` (or equivalent) needs App Store Connect / Google Play Console price updated to $39.99
- This is a manual step in the App Store Connect dashboard — I'll flag it but the code references in `src/constants/revenuecat.ts` don't hardcode pass prices (only subscription prices), so no code change needed there

## Files

| File | Change |
|------|--------|
| `src/components/conversion/TripPassModal.tsx` | Price $29.99→$39.99, nudge copy ~4→~3 |
| `src/billing/config.ts` | `price: 29.99` → `39.99`, new Stripe Price ID |
| `supabase/functions/create-checkout/index.ts` | New Stripe Price ID for explorer pass |

## Stripe Action Required
Create a new Price on product `prod_Tx0AZIWAubAWD3` at $39.99 USD one-time using the Stripe tool, then swap the Price ID in code.

## Manual Action (RevenueCat / App Store)
Update the Explorer Trip Pass price in App Store Connect to $39.99 (Tier 57 or nearest). This is outside code scope.
