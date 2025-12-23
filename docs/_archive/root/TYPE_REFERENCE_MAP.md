# Type & Dependency Reference Map
## Chravel Frequent Chraveler Tier Migration

**Generated:** 2025-10-26
**Branch:** claude/tier-migration-audit-011CUWHLd4sfTx2u9yq4PoTz
**Status:** ⚠️ Critical Issues Found

---

## 🎯 Tier Type Propagation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ TYPE DEFINITIONS (Source of Truth)                          │
├─────────────────────────────────────────────────────────────┤
│ src/types/consumer.ts:3                                     │
│   tier: 'free' | 'explorer' | 'frequent-chraveler' ✅       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├──────────────┬──────────────┬──────────────┐
                          ▼              ▼              ▼              ▼
         ┌─────────────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐
         │ Stripe Constants    │  │ React Hooks  │  │ Components │  │ Supabase     │
         │ ❌ MISMATCH         │  │ ✅ CORRECT   │  │ ✅ CORRECT │  │ ⚠️ WEBHOOK   │
         └─────────────────────┘  └──────────────┘  └────────────┘  └──────────────┘
         │                        │                  │                │
         │ 'consumer-pro' ❌     │ Maps correctly   │ UI displays   │ Returns 'pro'
         │ Should be:             │ to 'frequent-    │ 'Frequent     │ instead of
         │ 'consumer-frequent-    │ chraveler'       │ Chraveler'    │ 'frequent-
         │  chraveler'            │                  │               │  chraveler' ❌
         │                        │                  │               │
         └────────────────────────┴──────────────────┴───────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Runtime Behavior│
                          │ ⚠️ BROKEN       │
                          └─────────────────┘
```

---

## 📦 Module Dependencies

### ✅ **Correctly Aligned Modules**

| Module | Location | Tier Reference | Status |
|--------|----------|----------------|--------|
| **Type Definitions** | `src/types/consumer.ts:3` | `'frequent-chraveler'` | ✅ Correct |
| **Pricing Constants** | `src/types/consumer.ts:118` | `'frequent-chraveler'` | ✅ Correct |
| **Feature Access** | `src/types/consumer.ts:142` | `'frequent-chraveler'` | ✅ Correct |
| **Billing Section** | `src/components/consumer/ConsumerBillingSection.tsx` | `'frequent-chraveler'` | ✅ Correct |
| **Pricing UI** | `src/components/conversion/PricingSection.tsx:104` | `'frequent-chraveler'` | ✅ Correct |
| **Trip Categories** | `src/components/trip/TripCategorySelector.tsx:26` | `'frequent-chraveler'` | ✅ Correct |

### ❌ **Misaligned Modules (CRITICAL)**

| Module | Location | Current Value | Expected Value | Impact |
|--------|----------|---------------|----------------|--------|
| **Stripe Constants** | `src/constants/stripe.ts:12` | `'consumer-pro'` | `'consumer-frequent-chraveler'` | 🔴 **BLOCKING** - Type mismatch breaks billing |
| **Stripe Webhook** | `supabase/functions/check-subscription/index.ts:85` | `tier = 'pro'` | `tier = 'frequent-chraveler'` | 🔴 **BLOCKING** - Returns wrong tier |
| **Hook Mapping** | `src/hooks/useConsumerSubscription.tsx:54` | References `'consumer-pro'` | Should use `'consumer-frequent-chraveler'` | ⚠️ **WARNING** - Fallback code path |

---

## 🗄️ Database Schema Alignment

| Table/Column | Status | Notes |
|--------------|--------|-------|
| `trips.categories` | ❌ **MISSING** | Required for TripCategorySelector to persist data |
| `user_pro_trip_quota` | ❌ **MISSING** | Required to track Frequent Chraveler's 1 Pro trip/month |
| `concierge_usage` | ✅ **EXISTS** | Already tracks AI queries (migration 20251023235412) |
| `profiles.subscription_tier` | ❌ **MISSING** | Intentionally removed for security. Tier derived from Stripe webhook. |

---

## 🔄 Data Flow: Subscription Tier Detection

```
┌───────────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW (WITH ISSUES)                                            │
└───────────────────────────────────────────────────────────────────────┘

1️⃣ User subscribes in Stripe
   └─> Product: prod_TBD_PRO ❌ (should be prod_TBD_FREQUENT_CHRAVELER)

2️⃣ Stripe webhook calls check-subscription
   └─> Returns: { tier: 'pro' } ❌ (should be 'frequent-chraveler')

3️⃣ Frontend: useConsumerSubscription.tsx
   ├─> Receives tier from webhook
   ├─> Tries to map product_id via STRIPE_PRODUCTS
   │   └─> Looks for 'consumer-frequent-chraveler' key
   │       └─> KEY DOESN'T EXIST ❌ (only 'consumer-pro' exists)
   └─> Falls back to legacy mapping
       └─> Maps 'consumer-pro' → 'frequent-chraveler' ✅ (works but fragile)

4️⃣ Components receive tier
   └─> Display 'Frequent Chraveler' ✅ (components use correct labels)

┌───────────────────────────────────────────────────────────────────────┐
│ CORRECTED FLOW (AFTER FIXES)                                          │
└───────────────────────────────────────────────────────────────────────┘

1️⃣ User subscribes in Stripe
   └─> Product: prod_TBD_FREQUENT_CHRAVELER ✅

2️⃣ Stripe webhook calls check-subscription
   └─> Returns: { tier: 'frequent-chraveler' } ✅

3️⃣ Frontend: useConsumerSubscription.tsx
   ├─> Receives tier from webhook
   ├─> Maps product_id via STRIPE_PRODUCTS['consumer-frequent-chraveler'] ✅
   └─> Sets tier state correctly

4️⃣ Components receive tier
   └─> All feature gates work correctly ✅
```

---

## 🎨 Component Tier Dependencies

| Component | Tier Check Logic | Database Dependency | Status |
|-----------|------------------|---------------------|--------|
| **TripCategorySelector** | `tier === 'explorer' \|\| tier === 'frequent-chraveler'` | `trips.categories` ❌ MISSING | ⚠️ Uses localStorage |
| **ConsumerBillingSection** | Displays current tier from hook | None | ✅ Works |
| **PricingSection** | Static display, no tier check | None | ✅ Works |
| **AI Concierge** (useConciergeUsage) | Checks `FEATURE_ACCESS.AI_QUERIES_*` | `concierge_usage` ✅ | ✅ Works |

---

## 🧩 Import Graph: Where Tier Types Are Used

```
src/types/consumer.ts (DEFINITION)
├─> src/hooks/useConsumerSubscription.tsx (READS & MAPS)
│   ├─> src/components/consumer/ConsumerBillingSection.tsx
│   ├─> src/components/trip/TripCategorySelector.tsx
│   └─> src/components/conversion/PricingSection.tsx
│
├─> src/constants/stripe.ts ❌ MISMATCH
│   └─> src/hooks/useConsumerSubscription.tsx (ACCESSES STRIPE_PRODUCTS)
│       └─> Expects 'consumer-frequent-chraveler' key
│           └─> Currently only has 'consumer-pro' ❌
│
└─> supabase/functions/check-subscription/index.ts ❌ MISMATCH
    └─> Returns 'pro' instead of 'frequent-chraveler'
```

---

## 🔧 Files Requiring Updates

### 🔴 Critical (Must Fix Before Cursor)

1. **src/constants/stripe.ts**
   - Line 12: Rename key `'consumer-pro'` → `'consumer-frequent-chraveler'`
   - Line 13: Update `product_id: 'prod_TBD_PRO'` → `'prod_TBD_FREQUENT_CHRAVELER'`
   - Line 16: Update `name: 'Pro'` → `'Frequent Chraveler'`

2. **supabase/functions/check-subscription/index.ts**
   - Line 85: Change `tier = 'pro'` → `tier = 'frequent-chraveler'`
   - Line 86: Change `tier = 'pro'` → `tier = 'frequent-chraveler'` (legacy mapping)
   - Line 89: Change all `tier === 'pro'` checks → `tier === 'frequent-chraveler'`

3. **supabase/migrations/** (NEW FILE)
   - Create migration to add `trips.categories` column
   - Create migration to add `user_pro_trip_quota` table
   - See: `migration-diff-preview.sql`

### ⚠️ Non-Critical (Can Fix After Core Issues)

4. **src/hooks/useConsumerSubscription.tsx**
   - Line 54: Update legacy mapping comment to clarify 'consumer-pro' is deprecated

5. **src/components/trip/TripCategorySelector.tsx**
   - Line 42-44: Update to use Supabase mutation instead of localStorage
   - Requires migration to be applied first

---

## 📊 Type Coverage Analysis

| Type Union | Definition Location | Consumer Locations | Coverage |
|------------|---------------------|-------------------|----------|
| `'free' \| 'explorer' \| 'frequent-chraveler'` | `consumer.ts:3` | 14 files | ✅ 100% |
| Stripe Product Keys | `stripe.ts` | 2 files (hook + constants) | ❌ 0% (wrong key) |
| Webhook Tier Response | `check-subscription/index.ts` | 1 file (hook) | ❌ 0% (wrong value) |

---

## 🧪 Runtime Type Safety Issues

### Issue 1: Stripe Key Access
```typescript
// src/hooks/useConsumerSubscription.tsx:53
else if (product_id === STRIPE_PRODUCTS['consumer-frequent-chraveler']?.product_id)

// ❌ RUNTIME ERROR: STRIPE_PRODUCTS['consumer-frequent-chraveler'] is undefined
// ✅ FIX: Rename key in stripe.ts to 'consumer-frequent-chraveler'
```

### Issue 2: Webhook Tier Mismatch
```typescript
// supabase/functions/check-subscription/index.ts:85
tier = 'pro' // ❌ Type is 'pro' but should be 'frequent-chraveler'

// Frontend expects: 'free' | 'explorer' | 'frequent-chraveler'
// ❌ RUNTIME: 'pro' is not in the union, will default to 'free'
```

### Issue 3: Database Persistence
```typescript
// TripCategorySelector.tsx:43
onCategoriesChange(newCategories); // ❌ Only updates parent state, no DB write

// ✅ FIX: Add Supabase mutation after migration:
await supabase.from('trips').update({ categories: newCategories }).eq('id', tripId);
```

---

## 📋 Summary & Next Steps

### ✅ What's Working
- Type definitions are correct
- Frontend components display correct tier names
- Pricing constants are accurate
- Feature access gates are properly defined
- AI query tracking table exists

### ❌ What's Broken (Blocking)
1. Stripe constant key mismatch (`'consumer-pro'` vs `'consumer-frequent-chraveler'`)
2. Webhook returns wrong tier value (`'pro'` instead of `'frequent-chraveler'`)
3. Database missing `trips.categories` column
4. No `user_pro_trip_quota` table for tracking monthly Pro trip limits

### 🛠️ Recommended Fix Order
1. Update `stripe.ts` constant key (2 min)
2. Update `check-subscription/index.ts` tier mapping (2 min)
3. Apply migration for `trips.categories` (1 min)
4. Apply migration for `user_pro_trip_quota` (1 min)
5. Update `TripCategorySelector` to persist to DB (5 min)
6. Test subscription flow end-to-end (10 min)

**Total Estimated Time:** 21 minutes

---

## 🎯 Handoff Checklist for Cursor

- [ ] Stripe constant key renamed to `'consumer-frequent-chraveler'`
- [ ] Webhook tier mapping updated to return `'frequent-chraveler'`
- [ ] Migration file created and syntax-validated
- [ ] Database schema changes applied via `supabase db push`
- [ ] TripCategorySelector updated to use Supabase
- [ ] End-to-end test: Subscribe → Check tier → Edit categories
- [ ] Stripe products created in dashboard (prod_TBD_* → real IDs)

**Status:** ⚠️ NOT READY - Fix 3 critical issues first, then re-validate.
