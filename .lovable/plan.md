
# Fix Super Admin Access, Manage Subscription Button & Add Pro Plans to Settings

## Overview

Three critical issues to address:

1. **Super Admin bypass not working fully** - `ccamechi@gmail.com` is hitting feature limits despite being on the SUPER_ADMIN_EMAILS list
2. **"Manage Subscription" button fails** with "No portal URL received" - because the user has no Stripe customer record
3. **Pro plans not available in Billing settings** - Users can only see/select Plus plans (Free, Explorer, Frequent Chraveler), not Pro plans (Starter, Growth, Enterprise)

---

## Root Cause Analysis

### Issue 1: Super Admin Limits
The `useConsumerSubscription` hook already has super admin bypass logic (lines 117-123):
```typescript
const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
const currentTier = isSuperAdmin ? 'frequent-chraveler' : (subscription?.tier || 'free');
```

**Problem**: This only sets tier to `frequent-chraveler`, but super admins should also have Pro Enterprise access. The `getEntitlements()` function in `billing/entitlements.ts` already has proper super admin handling (lines 36-39), but some UI components check subscription tier directly instead of using entitlements.

### Issue 2: No Portal URL
**Problem**: The `customer-portal` edge function correctly returns `{error: 'no_subscription', message: '...'}` when no Stripe customer exists. However, the `ConsumerBillingSection` only checks for `data?.url`:
```typescript
if (data?.url) {
  window.open(data.url, '_blank');
} else {
  toast.error('No portal URL received');  // Shows this even for valid "no subscription" response
}
```

**Fix**: Handle the `no_subscription` response gracefully with a helpful message.

### Issue 3: Pro Plans Missing from Settings
**Problem**: `ConsumerBillingSection.tsx` only shows consumer tiers (Free, Explorer, Frequent Chraveler). The UI needs to include Pro plans so users can subscribe to both consumer and organization plans from one place.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useConsumerSubscription.tsx` | Enhanced super admin tier to return 'pro-enterprise' instead of 'frequent-chraveler' |
| `src/components/consumer/ConsumerBillingSection.tsx` | Handle no_subscription response, add Pro plans section |
| `supabase/functions/check-subscription/index.ts` | Add super admin bypass so backend returns enterprise tier |

---

## Implementation Details

### Step 1: Fix Super Admin Tier Detection

**File:** `src/hooks/useConsumerSubscription.tsx`

Update the super admin logic to set the highest tier:

```typescript
// Line 117-123: Change from
const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
const currentTier = isSuperAdmin ? 'frequent-chraveler' : (subscription?.tier || 'free');

// To:
const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
// Super admins get max consumer tier; Pro tier is handled separately
const currentTier = isSuperAdmin ? 'frequent-chraveler' : (subscription?.tier || 'free');
const isSubscribed = isSuperAdmin || (subscription?.status === 'active' && currentTier !== 'free');
// Super admins bypass ALL limits
const canCreateProTrip = isSuperAdmin || currentTier === 'frequent-chraveler';
const proTripQuota = isSuperAdmin ? -1 : (currentTier === 'frequent-chraveler' ? 1 : 0); // -1 = unlimited
```

Also update `src/billing/entitlements.ts` to ensure the `createSuperAdminEntitlements()` function returns `'pro-enterprise'` tier (already does - just verify it's being called).

### Step 2: Fix "Manage Subscription" Button

**File:** `src/components/consumer/ConsumerBillingSection.tsx`

Update `handleManageSubscription` to handle the `no_subscription` response:

```typescript
const handleManageSubscription = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;
    
    // Handle case where user has no Stripe subscription history
    if (data?.error === 'no_subscription') {
      toast.info(data.message || 'You don\'t have an active subscription yet. Choose a plan below to get started!');
      return;
    }
    
    if (data?.url) {
      window.open(data.url, '_blank');
    } else {
      toast.error('Unable to open subscription portal. Please try again.');
    }
  } catch (error) {
    toast.error(`Failed to open customer portal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
  }
};
```

Apply the same fix to `handleCancelSubscription`.

### Step 3: Add Pro Plans Section to Billing Settings

**File:** `src/components/consumer/ConsumerBillingSection.tsx`

Add a new section after the consumer plans for Pro/Organization plans:

```typescript
{/* Pro Organization Plans Section */}
<div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
  <h4 className="text-base font-semibold text-white mb-2">Organization Plans (ChravelApp Pro)</h4>
  <p className="text-sm text-gray-400 mb-4">
    For teams, sports organizations, tours, and enterprises. Pro subscribers get all Frequent Chraveler benefits included.
  </p>
  
  {/* Pro plan cards: Starter ($49), Growth ($99), Enterprise ($199) */}
  <div className="space-y-3">
    {proPlans.map((plan) => (
      <Collapsible key={plan.id} ...>
        {/* Similar structure to consumer plans */}
      </Collapsible>
    ))}
  </div>
</div>
```

Add Pro plans data:
```typescript
const proPlans = {
  'pro-starter': {
    name: 'Starter Pro',
    price: 49,
    icon: Building,
    features: [
      'Up to 50 team members',
      'Advanced permissions',
      'Team management dashboard',
      'Basic integrations',
      'Email support',
      '🎉 Unlimited Events for your team',
      '🎁 Your first Pro Trip + Event included free'
    ]
  },
  'pro-growth': {
    name: 'Growth Pro',
    price: 99,
    icon: TrendingUp,
    features: [
      'Up to 100 team members',
      'Multi-language support (coming soon)',
      'Priority support',
      'Advanced integrations (coming soon)',
      'Custom workflows',
      '🎉 Unlimited Events for your team',
      '🎁 Your first Pro Trip + Event included free'
    ]
  },
  'pro-enterprise': {
    name: 'Enterprise',
    price: 199,
    icon: Shield,
    features: [
      'Up to 250 team members',
      'Custom integrations',
      'Dedicated success manager',
      '24/7 premium support',
      '🎉 Unlimited Events for your team',
      '🎁 Your first Pro Trip + Event included free'
    ]
  }
} as const;
```

### Step 4: Add Super Admin Bypass to Backend

**File:** `supabase/functions/check-subscription/index.ts`

Add super admin check before Stripe lookup:

```typescript
// After user authentication (around line 65), add:
const SUPER_ADMIN_EMAILS = ['ccamechi@gmail.com'];

// Super admin bypass - return max tier without Stripe check
if (SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
  logStep("Super admin detected - bypassing Stripe check", { email: user.email });
  return createSecureResponse({
    subscribed: true,
    tier: 'pro-enterprise',
    product_id: 'super_admin_bypass',
    subscription_end: null, // Never expires
    is_super_admin: true
  });
}
```

---

## Logic: Pro Subscription Includes Frequent Chraveler

When a user has a Pro subscription, they automatically get all Frequent Chraveler benefits. This is already handled in `billing/entitlements.ts`:

```typescript
// Pro tiers include all consumer entitlements
'pro-starter': {
  entitlements: [
    ...FREQUENT_CHRAVELER_ENTITLEMENTS,  // Include consumer benefits
    'channels_enabled',
    'roles_enabled',
    'roster_management',
    // ... pro-specific features
  ]
}
```

---

## Summary of Changes

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Super admin limits | Backend returns free tier for super admins without Stripe record | Add server-side super admin bypass in `check-subscription` |
| No portal URL | UI doesn't handle `no_subscription` response | Add handling for `error: 'no_subscription'` with friendly toast |
| Pro plans not in settings | `ConsumerBillingSection` only shows consumer tiers | Add Pro plans section with upgrade buttons |

---

## Verification Checklist

After implementation:
- [ ] Log in as `ccamechi@gmail.com` → Should have unlimited access to all features
- [ ] Click "Manage Subscription" without active subscription → Should show helpful message, not error
- [ ] Settings > Billing should show both Plus AND Pro plan options
- [ ] Upgrading to Pro should open Stripe checkout
- [ ] Pro subscribers should have access to all Frequent Chraveler features automatically
