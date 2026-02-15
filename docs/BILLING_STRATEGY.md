# Chravel Billing Strategy

## Overview

This document outlines Chravel's billing architecture, designed to comply with Apple App Store guidelines while providing a seamless experience across web, iOS, and Android.

## Architecture

### Entitlement-Based Model

Instead of checking subscription tiers directly, we use an **entitlement-based** model:

```typescript
// ❌ Old approach (tier-based)
if (user.tier === 'premium') {
  showFeature();
}

// ✅ New approach (entitlement-based)
if (canUseFeature('ai_concierge', entitlements)) {
  showFeature();
}
```

This provides flexibility to:
- Grant features independently of tiers
- Handle promotional access
- Support legacy subscriptions
- Implement feature flags

### Module Structure

```
src/billing/
├── index.ts                    # Public API
├── types.ts                    # Entitlement types
├── config.ts                   # Product/feature mapping
├── entitlements.ts             # Core logic
├── providers/
│   ├── base.ts                 # Abstract interface
│   ├── stripe.ts               # Web payments
│   ├── iap.ts                  # Apple IAP (scaffold)
│   └── index.ts                # Platform selector
└── hooks/
    ├── useBilling.ts           # Main hook
    └── useEntitlements.ts      # Lightweight checks
```

## Apple App Store Compliance

### What MUST Use IAP

Per Apple's [App Store Review Guidelines 3.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase):

| Category | Examples | IAP Required? |
|----------|----------|---------------|
| Consumer Subscriptions | Explorer, Frequent Chraveler | ✅ YES |
| AI Features | Concierge queries, Smart Import (Calendar/Agenda/Line-up) | ✅ YES |
| Digital Storage | Extended media storage | ✅ YES |
| Export Features | PDF itinerary export | ✅ YES |

### What CAN Use External Payment

The [Reader Rule](https://developer.apple.com/support/reader-apps/) and B2B exceptions allow:

| Category | Examples | Web Checkout OK? |
|----------|----------|------------------|
| B2B/Enterprise | Pro Starter, Growth, Enterprise | ✅ YES |
| Real-World Services | Trip expense payments, Venmo splits | ✅ YES |
| Physical Goods | Merchandise (if ever added) | ✅ YES |

### Current Implementation Status

| Platform | Consumer Plans | Pro Plans | Status |
|----------|----------------|-----------|--------|
| Web | Stripe ✅ | Stripe ✅ | Complete |
| iOS | IAP (scaffold) | Stripe ✅ | IAP pending |
| Android | Google Play (future) | Stripe ✅ | Planned |

## Implementation Checklist

### Phase 1: Billing Abstraction ✅

- [x] Create `/src/billing/` module
- [x] Define entitlement types
- [x] Implement `getEntitlements()` 
- [x] Implement `canUseFeature()`
- [x] Create Stripe provider
- [x] Create IAP provider scaffold
- [x] Create platform selector
- [x] Create `useBilling` hook

### Phase 2: iOS IAP (Pending)

- [ ] Install `@capacitor-community/in-app-purchases`
  ```bash
  npm install @capacitor-community/in-app-purchases
  npx cap sync
  ```

- [ ] Configure products in App Store Connect
  - Subscription Group: "Chravel Consumer"
  - Products:
    - `com.chravel.explorer.monthly` ($4.99/mo)
    - `com.chravel.explorer.annual` ($49.99/yr)
    - `com.chravel.frequentchraveler.monthly` ($9.99/mo)
    - `com.chravel.frequentchraveler.annual` ($99.99/yr)

- [ ] Create receipt validation Edge Function
  ```typescript
  // supabase/functions/validate-apple-receipt/index.ts
  // - Validate receipt with Apple
  // - Update user entitlements
  // - Handle sandbox vs production
  ```

- [ ] Add App Store secrets
  ```
  APPLE_SHARED_SECRET=<from App Store Connect>
  ```

- [ ] Configure App Store Server Notifications
  - Webhook URL: `https://[project-ref].supabase.co/functions/v1/apple-webhook`
  - Events: SUBSCRIBED, DID_RENEW, DID_CHANGE_RENEWAL_STATUS, EXPIRED

- [ ] Test in sandbox
  - Create sandbox test users
  - Test purchase flow
  - Test restore flow
  - Test renewal/expiry

- [ ] Enable IAP
  ```typescript
  // src/billing/config.ts
  BILLING_FLAGS.APPLE_IAP_ENABLED = true
  ```

- [ ] Submit for App Review

### Phase 3: Android (Future)

- [ ] Install `@capgo/capacitor-purchases` or similar
- [ ] Configure products in Google Play Console
- [ ] Create receipt validation Edge Function
- [ ] Test in sandbox
- [ ] Enable in config

## Review Risk Checklist

Before submitting to App Store, verify:

### High Risk (Will Cause Rejection)

| Issue | How to Check | Fix |
|-------|--------------|-----|
| External payment for consumer features | Search for Stripe checkout on iOS consumer flows | Use IAP provider |
| "Subscribe on website" messaging | Check iOS UI for web links | Remove or gate behind settings |
| Price differences web vs IAP | Compare Stripe prices to App Store prices | Match prices or hide web prices on iOS |

### Medium Risk (May Cause Rejection)

| Issue | How to Check | Fix |
|-------|--------------|-----|
| Missing restore button | Check iOS subscription UI | Add "Restore Purchases" button |
| Unclear subscription terms | Check paywall UI | Show duration, price, renewal terms |
| No subscription management | Check settings | Add link to iOS subscription settings |

### Low Risk (Best Practice)

| Issue | How to Check | Fix |
|-------|--------------|-----|
| No free trial | Check product config | Consider adding trial period |
| Missing cancellation info | Check subscription UI | Add "Cancel anytime" messaging |

## Migration Guide

### From `useConsumerSubscription` to `useBilling`

The new `useBilling` hook is a drop-in replacement with additional features:

```typescript
// Old
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
const { tier, isPlus, upgradeToTier } = useConsumerSubscription();

// New
import { useBilling } from '@/billing';
const { tier, isSubscribed, purchase } = useBilling();

// Additional features
const { canUseFeature, platform, showWebSubscribePrompt } = useBilling();
```

### Legacy Compatibility

The new module maintains backward compatibility:

| Old API | New API | Notes |
|---------|---------|-------|
| `isPlus` | `isSubscribed` | Same meaning |
| `tier` | `tier` | Same type |
| `upgradeToTier()` | `purchase()` | Takes PurchaseRequest |
| `canCreateProTrip` | `canUseFeature('pro_trip_creation')` | Entitlement-based |

## Feature Gating Examples

### AI Concierge

```typescript
function AIConcierge({ tripId }) {
  const { canUseFeature } = useBilling();
  const { data: usage } = useQuery(['ai-usage', tripId], ...);
  
  const canUseAI = canUseFeature('ai_concierge', {
    tripId,
    usageCount: usage?.count ?? 0,
  });
  
  if (!canUseAI) {
    return <UpgradePrompt feature="ai_concierge" />;
  }
  
  return <AIConciergeUI />;
}
```

### Pro Trip Creation

```typescript
function CreateTripButton() {
  const { canCreateProTrip, showWebSubscribePrompt, platform } = useBilling();
  
  if (!canCreateProTrip) {
    if (showWebSubscribePrompt) {
      return <SubscribeOnWebPrompt />;
    }
    return <UpgradePrompt feature="pro_trip_creation" />;
  }
  
  return <Button onClick={createProTrip}>Create Pro Trip</Button>;
}
```

## Testing

### Unit Tests

```typescript
// Test entitlement mapping
test('explorer tier has correct entitlements', () => {
  const ents = getEntitlementsForTier('explorer');
  expect(ents).toContain('ai_queries_extended');
  expect(ents).not.toContain('pro_trip_creation');
});

// Test feature access
test('free user cannot export PDF', () => {
  const ents = { tier: 'free', entitlements: new Set(['ai_queries_basic']) };
  expect(canUseFeature('pdf_export', ents)).toBe(false);
});
```

### Integration Tests

1. **Web Flow**: Subscribe via Stripe → Verify entitlements update
2. **iOS Flow** (when ready): Purchase via IAP → Verify entitlements update
3. **Restore Flow**: Sign out → Sign in → Verify entitlements restored
4. **Cross-Platform**: Subscribe on web → Open iOS app → Verify access

## Support

For billing issues:
- Check Edge Function logs in Supabase Dashboard
- Review Stripe Dashboard for payment status
- Check App Store Connect for IAP status (when implemented)

## References

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Capacitor IAP Plugin](https://github.com/nicklockwood/InAppPurchases)
