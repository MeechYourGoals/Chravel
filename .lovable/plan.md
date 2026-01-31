
# Fix Super Admin Full Access in Billing UI

## Problem Summary

The super admin account (`ccamechi@gmail.com`) is correctly identified in `useConsumerSubscription` for consumer features, but the billing UI has gaps:

1. **"Manage Subscription" button fails** - Calls Stripe customer-portal, but super admin has no Stripe record → shows error toast
2. **Pro plans show "Upgrade" buttons** - Should show Enterprise as "Current Plan" for super admin
3. **No indication of super admin status** - UI should reflect that this is a master/founder account

## Root Cause

The `useConsumerSubscription` hook exposes `isSuperAdmin` status internally (line 117) but does NOT expose it to the consuming components. The `ConsumerBillingSection` cannot know if the user is a super admin and thus cannot:
- Hide/disable the Manage/Cancel buttons
- Mark Enterprise as current plan

## Solution

### 1. Expose `isSuperAdmin` from useConsumerSubscription Hook

**File:** `src/hooks/useConsumerSubscription.tsx`

Add `isSuperAdmin` to the context type and provider return value so components can check super admin status:

```typescript
// Add to interface (line 9-20)
interface ConsumerSubscriptionContextType {
  // ... existing fields
  isSuperAdmin: boolean;  // NEW
  proTier: string | null; // NEW - for super admin, this is 'pro-enterprise'
}

// Expose in return (line 126)
return (
  <ConsumerSubscriptionContext.Provider value={{
    // ... existing values
    isSuperAdmin,
    proTier: isSuperAdmin ? 'pro-enterprise' : null,
  }}>
```

### 2. Update ConsumerBillingSection to Handle Super Admin

**File:** `src/components/consumer/ConsumerBillingSection.tsx`

**A) Get super admin status from hook:**
```typescript
const { 
  subscription, tier, isSubscribed, upgradeToTier, isLoading,
  isSuperAdmin, proTier  // NEW
} = useConsumerSubscription();
```

**B) Disable Manage/Cancel buttons for super admin (lines 200-215):**
```typescript
{isSubscribed && (
  <div className="flex gap-3">
    {isSuperAdmin ? (
      // Super admin doesn't need Stripe portal
      <div className="text-sm text-amber-400 bg-amber-400/10 px-4 py-2 rounded-lg">
        ✨ Founder Access - All features unlocked
      </div>
    ) : (
      <>
        <button onClick={handleManageSubscription} ...>
          Manage Subscription
        </button>
        <button onClick={handleCancelSubscription} ...>
          Cancel Subscription
        </button>
      </>
    )}
  </div>
)}
```

**C) Mark Pro plans correctly for super admin (lines 331-380):**

For the Pro plans section, check if the plan matches the super admin's proTier:

```typescript
{Object.entries(proPlans).map(([key, plan]) => {
  const isCurrentProPlan = isSuperAdmin && key === 'pro-enterprise';
  const PlanIcon = plan.icon;
  
  return (
    <Collapsible ...>
      <CollapsibleTrigger className="w-full">
        <div className={`border rounded-lg p-3 ... ${
          isCurrentProPlan 
            ? 'border-amber-500/50 bg-amber-500/10'  // Highlight current plan
            : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex items-center justify-between">
            {/* ... plan info ... */}
            <div className="flex items-center gap-2">
              {isCurrentProPlan && (
                <div className="text-sm text-amber-400 font-medium">
                  Current Plan
                </div>
              )}
              <div className="text-muted-foreground">...</div>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {/* ... features list ... */}
        {!isCurrentProPlan && (
          <button onClick={() => handleUpgradeToProPlan(key)} ...>
            Upgrade to {plan.name}
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
})}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useConsumerSubscription.tsx` | Export `isSuperAdmin` and `proTier` in context |
| `src/components/consumer/ConsumerBillingSection.tsx` | Consume `isSuperAdmin`/`proTier`, conditionally render buttons and plan indicators |

## Expected UI After Fix

For super admin (`ccamechi@gmail.com`):

**Current Plan Section:**
- Shows "Frequent-Chraveler" with crown icon (consumer tier)
- Shows "✨ Founder Access - All features unlocked" instead of Manage/Cancel buttons

**Consumer Plans Section:**
- "Frequent Chraveler" marked as "Current Plan" ✓

**Pro Plans Section:**
- "Enterprise" marked as "Current Plan" with amber highlight
- No "Upgrade to Enterprise" button for Enterprise tier
- Starter Pro and Growth Pro still show upgrade buttons (user could theoretically downgrade in future)

## Test Plan

1. Log in as `ccamechi@gmail.com`
2. Go to Settings → Billing
3. Verify:
   - Consumer section shows "Frequent-Chraveler" as current
   - No error toast appears
   - "Founder Access" badge shown instead of Manage/Cancel buttons
   - Enterprise in Pro section shows "Current Plan" badge
   - No "Upgrade to Enterprise" button visible
