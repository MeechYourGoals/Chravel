---
name: chravel-payments
description: Implement and debug Chravel's payment features — RevenueCat subscriptions, trip payment requests, expense splitting, and balance management. Use when working on payments, subscriptions, entitlements, or billing. Triggers on "payment", "RevenueCat", "subscription", "expense split", "billing", "entitlement", "balance".
---

# Chravel Payments & RevenueCat

Chravel's payment system covers subscriptions (RevenueCat) and trip-level expense management.

## Architecture

### Key Locations
- `src/integrations/revenuecat/` — RevenueCat SDK integration
- `src/types/payments.ts` — Payment type definitions
- `src/types/paymentMethods.ts` — Payment method types
- `src/hooks/useBalanceSummary.ts` — Balance calculation
- `src/components/` — Payment UI components

### Two Payment Systems

#### 1. RevenueCat (Subscriptions/Entitlements)
- Manages Chravel Pro subscriptions
- Platform-specific billing (iOS App Store, Google Play, web)
- Entitlement checks gate pro features
- Free tier vs Pro tier feature matrix

#### 2. Trip Payments (P2P)
- Payment requests within trips
- Expense splitting among trip members
- Balance tracking per member
- Settlement suggestions

## Critical Rules

### 1. Entitlement Checks
- ALWAYS check entitlements server-side (RLS or edge function)
- Client-side checks are for UI gating only, never security
- Free users should see pro features as locked, not hidden
- Entitlement state must be fresh (not cached indefinitely)

### 2. Payment Mutations
- All payment mutations require explicit user confirmation
- Show exact amounts before any charge
- Handle currency correctly (store as cents, display as dollars)
- Never auto-charge without explicit user action

### 3. Balance Calculations
- Balances must be calculated from source of truth (database)
- No client-side balance computation that could drift
- Show "who owes whom" clearly
- Handle edge cases: zero balance, negative balance, partial payments

### 4. Platform Parity
- RevenueCat entitlements must sync across web, iOS, Android
- If user subscribes on iOS, web must reflect pro status
- Handle restore purchases flow
- Handle subscription expiry gracefully

### 5. Security
- Never expose payment tokens or billing details in client code
- Never trust client-provided payment amounts
- Validate all payment operations server-side
- Log payment events for audit trail
