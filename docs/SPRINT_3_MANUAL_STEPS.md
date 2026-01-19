# Sprint 3: Monetization (RevenueCat / IAP) - Manual Configuration Steps

## Status

✅ **Implementation Verified**:
- RevenueCat Swift SDK integration (`SubscriptionManager.swift`)
- Paywall UI with restore purchases button (`PaywallView.swift`)
- Supabase entitlement sync edge function (`sync-revenuecat-entitlement`)
- Web-side entitlement sync hook (`useEntitlementsSync.ts`)
- Product IDs and entitlement IDs defined consistently across codebase

⚠️ **Manual Configuration Required**:
- Create 4 subscription products in App Store Connect
- Configure 2 entitlements in RevenueCat dashboard
- Create "Current" offering in RevenueCat
- Enable App Store Server Notifications V2
- Test sandbox subscriptions
- Replace test RevenueCat API key with production key

---

## Overview

Chravel uses RevenueCat for cross-platform subscription management. The implementation is already complete, but requires external dashboard configuration.

**Product Strategy**:
- **Free Tier**: No subscription required (limited features)
- **Explorer**: $9.99/month or $99/year (casual travelers)
- **Frequent Chraveler**: $19.99/month or $199/year (power users)

**Platform Support**:
- iOS: RevenueCat SDK with native paywall
- Web: Stripe Checkout (separate from RevenueCat)
- Entitlements sync to Supabase for feature gating

---

## 1. Create App Store Subscription Products

### Prerequisites
- Access to App Store Connect
- App created in App Store Connect (com.chravel.app)
- Agreements, Tax, and Banking completed

### Product Configuration

Create 4 **auto-renewable subscription** products:

#### Product 1: Explorer Monthly

| Field | Value |
|-------|-------|
| **Reference Name** | Chravel Explorer Monthly |
| **Product ID** | `com.chravel.explorer.monthly` |
| **Subscription Group** | Chravel Subscriptions |
| **Subscription Duration** | 1 Month |
| **Price** | $9.99 USD |
| **Localized Display Name** | Explorer |
| **Localized Description** | Perfect for casual travelers. Extended AI queries, up to 25 trips, PDF export, calendar sync, and priority support. |

#### Product 2: Explorer Annual

| Field | Value |
|-------|-------|
| **Reference Name** | Chravel Explorer Annual |
| **Product ID** | `com.chravel.explorer.annual` |
| **Subscription Group** | Chravel Subscriptions |
| **Subscription Duration** | 1 Year |
| **Price** | $99.00 USD |
| **Localized Display Name** | Explorer (Annual) |
| **Localized Description** | Perfect for casual travelers. Save 17% with annual billing. Extended AI queries, up to 25 trips, PDF export, calendar sync, and priority support. |
| **Introductory Offer** | Optional: 3-day free trial or $4.99 for first month |

#### Product 3: Frequent Chraveler Monthly

| Field | Value |
|-------|-------|
| **Reference Name** | Chravel Frequent Chraveler Monthly |
| **Product ID** | `com.chravel.frequentchraveler.monthly` |
| **Subscription Group** | Chravel Subscriptions |
| **Subscription Duration** | 1 Month |
| **Price** | $19.99 USD |
| **Localized Display Name** | Frequent Chraveler |
| **Localized Description** | For power travelers who want it all. Unlimited AI queries, unlimited trips, unlimited storage, create Pro trips, create events (up to 100 attendees), and all Explorer features. |

#### Product 4: Frequent Chraveler Annual

| Field | Value |
|-------|-------|
| **Reference Name** | Chravel Frequent Chraveler Annual |
| **Product ID** | `com.chravel.frequentchraveler.annual` |
| **Subscription Group** | Chravel Subscriptions |
| **Subscription Duration** | 1 Year |
| **Price** | $199.00 USD |
| **Localized Display Name** | Frequent Chraveler (Annual) |
| **Localized Description** | For power travelers who want it all. Save 17% with annual billing. Unlimited AI queries, unlimited trips, unlimited storage, create Pro trips, create events, and all Explorer features. |
| **Introductory Offer** | Optional: 7-day free trial or $9.99 for first month |

### Steps to Create Products

1. **Navigate to App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Select your app (Chravel)
   - Go to "Features" → "In-App Purchases"

2. **Create Subscription Group** (if not exists)
   - Click "+" next to "Subscription Groups"
   - Name: "Chravel Subscriptions"
   - Click "Create"

3. **Add Each Subscription**
   - Click "+" inside the subscription group
   - Choose "Auto-Renewable Subscription"
   - Fill in Product ID (MUST match exactly)
   - Set reference name for internal use
   - Configure pricing and duration
   - Add localized display name and description
   - Set subscription group ranking (Explorer < Frequent Chraveler)
   - Configure introductory offers (optional but recommended)
   - Click "Save"

4. **Configure Subscription Group Settings**
   - **Subscription Group Display Name**: "Chravel Premium"
   - **Description**: "Premium subscriptions for Chravel"
   - **Group Ranking**:
     - Frequent Chraveler (highest priority)
     - Explorer (standard priority)

5. **Submit for Review**
   - Each product must be reviewed before going live
   - Provide screenshot of subscription in use (paywall)
   - Explain value proposition
   - Submit along with app binary

### Subscription Group Upgrade/Downgrade Behavior

Configure the following upgrade/downgrade paths:

- **Explorer Monthly → Frequent Chraveler Monthly**: Immediate upgrade, prorated
- **Explorer Annual → Frequent Chraveler Annual**: Immediate upgrade, prorated
- **Frequent Chraveler → Explorer**: Downgrade at end of current period
- **Monthly → Annual (same tier)**: Switch at end of current period or immediate with proration

---

## 2. Configure RevenueCat Entitlements

### Prerequisites
- RevenueCat account created
- iOS app configured in RevenueCat dashboard
- Production API key obtained (see Sprint 1 manual steps)

### Entitlement Configuration

Create 2 entitlements in RevenueCat dashboard:

#### Entitlement 1: chravel_explorer

| Field | Value |
|-------|-------|
| **Entitlement Identifier** | `chravel_explorer` |
| **Display Name** | Chravel Explorer |
| **Description** | Explorer tier subscription benefits |
| **Products** | `com.chravel.explorer.monthly`, `com.chravel.explorer.annual` |

#### Entitlement 2: chravel_frequent_chraveler

| Field | Value |
|-------|-------|
| **Entitlement Identifier** | `chravel_frequent_chraveler` |
| **Display Name** | Chravel Frequent Chraveler |
| **Description** | Frequent Chraveler tier subscription benefits |
| **Products** | `com.chravel.frequentchraveler.monthly`, `com.chravel.frequentchraveler.annual` |

### Steps to Create Entitlements

1. **Log in to RevenueCat**
   - Go to https://app.revenuecat.com
   - Select your Chravel iOS app project

2. **Navigate to Entitlements**
   - Click "Entitlements" in the left sidebar
   - Click "New Entitlement"

3. **Create Explorer Entitlement**
   - Entitlement Identifier: `chravel_explorer` (MUST match code)
   - Display Name: "Chravel Explorer"
   - Description: "Explorer tier subscription benefits"
   - Click "Save"

4. **Create Frequent Chraveler Entitlement**
   - Entitlement Identifier: `chravel_frequent_chraveler` (MUST match code)
   - Display Name: "Chravel Frequent Chraveler"
   - Description: "Frequent Chraveler tier subscription benefits"
   - Click "Save"

5. **Verify Consistency**
   - Entitlement IDs MUST match:
     - `ios/App/App/RevenueCat/SubscriptionManager.swift` (lines 14-22)
     - `src/constants/revenuecat.ts` (lines 26-37)
     - `supabase/functions/sync-revenuecat-entitlement/index.ts` (lines 10-16)

---

## 3. Set Up App Store Offerings

### Prerequisites
- App Store subscription products created and approved
- RevenueCat entitlements configured
- Products linked to App Store Connect

### Offering Configuration

Create a **"Current"** offering in RevenueCat:

| Field | Value |
|-------|-------|
| **Offering Identifier** | `current` |
| **Display Name** | Current Offering |
| **Description** | Default offering for all users |
| **Packages** | See table below |

### Package Configuration

Add 4 packages to the "Current" offering:

| Package Identifier | Product | Type | Entitlement |
|--------------------|---------|------|-------------|
| `explorer_monthly` | com.chravel.explorer.monthly | Custom | chravel_explorer |
| `explorer_annual` | com.chravel.explorer.annual | Custom | chravel_explorer |
| `frequent_chraveler_monthly` | com.chravel.frequentchraveler.monthly | Custom | chravel_frequent_chraveler |
| `frequent_chraveler_annual` | com.chravel.frequentchraveler.annual | Custom | chravel_frequent_chraveler |

**Alternative**: Use RevenueCat's standard package types:
- `$rc_monthly` → map to explorer monthly
- `$rc_annual` → map to explorer annual
- Custom packages for Frequent Chraveler

### Steps to Create Offering

1. **Navigate to Offerings**
   - In RevenueCat dashboard, click "Offerings"
   - Click "New Offering"

2. **Create Current Offering**
   - Offering Identifier: `current` (lowercase, MUST match code)
   - Display Name: "Current Offering"
   - Description: "Default offering for all users"
   - Make this the **default offering** (toggle on)
   - Click "Save"

3. **Add Packages to Offering**
   - Click "Add Package" for each of the 4 products
   - For each package:
     - Select the Product from dropdown (must be configured in App Store first)
     - Assign Package Identifier (e.g., `explorer_monthly`)
     - Link to Entitlement (e.g., `chravel_explorer`)
     - Click "Save"

4. **Reorder Packages** (optional)
   - Drag packages to desired display order
   - Recommended order:
     1. Frequent Chraveler Annual (best value)
     2. Frequent Chraveler Monthly
     3. Explorer Annual
     4. Explorer Monthly

5. **Set Offering as Default**
   - Ensure "Default Offering" toggle is ON
   - This offering will be returned by `Purchases.shared.offerings()` in code

### Testing Offerings

Test that offerings load correctly:

```swift
// In Xcode, run this in app
Task {
    do {
        let offerings = try await Purchases.shared.offerings()
        print("Current offering:", offerings.current?.identifier)
        print("Available packages:", offerings.current?.availablePackages.count)
    } catch {
        print("Error:", error)
    }
}
```

Expected output:
```
Current offering: current
Available packages: 4
```

---

## 4. Enable App Store Server Notifications

### Prerequisites
- App Store Connect access with Admin role
- RevenueCat project configured

### Configuration

App Store Server Notifications V2 enables real-time subscription event updates (renewals, cancellations, refunds).

### Steps to Enable

1. **Get RevenueCat Webhook URL**
   - Log in to RevenueCat dashboard
   - Go to Project Settings → Apple App Store
   - Copy the **App Store Server Notification URL**
   - Format: `https://api.revenuecat.com/v1/subscribers/app_store_server_notifications/{YOUR_PROJECT_ID}`

2. **Configure in App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Select your app
   - Go to "App Information" section
   - Scroll to "App Store Server Notifications"

3. **Add Notification URL**
   - Paste RevenueCat webhook URL
   - Select **Version 2** (NOT Version 1)
   - Enable the following notification types:
     - ✅ Subscriptions
     - ✅ Refunds
     - ✅ Price Increases
     - ✅ Renewals
   - Click "Save"

4. **Send Test Notification**
   - Click "Send Test Notification"
   - Select notification type (e.g., SUBSCRIBED)
   - Click "Send"
   - Verify it appears in RevenueCat webhook logs

5. **Verify in RevenueCat**
   - Go to RevenueCat Dashboard → Integrations → Apple App Store
   - Check "Last Notification Received" timestamp
   - Should update within seconds of test notification

### What This Enables

With Server Notifications enabled:
- **Instant renewal updates**: No polling required
- **Refund detection**: Revoke access immediately
- **Billing issue alerts**: Grace period handling
- **Subscription status sync**: Always up-to-date in RevenueCat and Supabase

---

## 5. Verify Restore Purchases Implementation

### Implementation Status

✅ **Already Implemented** - No code changes needed

The restore purchases flow is fully implemented in:

#### iOS Native (Swift)
- **File**: `ios/App/App/RevenueCat/SubscriptionManager.swift`
- **Method**: `restorePurchases()` (lines 272-287)
- **UI**: `ios/App/App/RevenueCat/PaywallView.swift` (lines 192-277)
- **Button**: "Restore Purchases" button in paywall

#### Web (TypeScript)
- **File**: `src/integrations/revenuecat/revenuecatClient.ts`
- **Function**: `restorePurchases()`
- **UI**: `src/components/subscription/SubscriptionPaywall.tsx`

### Testing Restore Purchases

#### Scenario 1: New Device, Same Apple ID

1. **Device A**: Purchase Explorer Monthly subscription
2. **Device B**: Install app, log in with same Apple ID
3. **Device B**: Open paywall, tap "Restore Purchases"
4. **Expected**: Subscription activates immediately
5. **Verify**: Entitlements appear in Supabase `user_entitlements` table

#### Scenario 2: No Previous Purchases

1. Install app on new device with Apple ID that never purchased
2. Open paywall, tap "Restore Purchases"
3. **Expected**: Alert shows "No purchases to restore"

#### Scenario 3: After Reinstall

1. Uninstall app
2. Reinstall app
3. Log in with Apple ID that previously purchased
4. Open paywall, tap "Restore Purchases"
5. **Expected**: Subscription restored

### Apple Compliance

Apple **requires** a "Restore Purchases" button for all apps with subscriptions:
- ✅ Button present in paywall (line 192 of PaywallView.swift)
- ✅ Calls RevenueCat `restorePurchases()` method
- ✅ Shows success/error feedback to user
- ✅ Updates entitlements in Supabase

**Apple Guideline Reference**: App Store Review Guideline 3.1.1

---

## 6. Test Sandbox Subscription Lifecycle

### Prerequisites
- Sandbox Apple ID created (NOT your real Apple ID)
- App installed on test device or simulator
- RevenueCat configured with production API key

### Create Sandbox Apple ID

1. Go to https://appstoreconnect.apple.com
2. Navigate to "Users and Access" → "Sandbox Testers"
3. Click "+" to add tester
4. Fill in:
   - Email: Use + trick (e.g., `yourname+sandbox1@gmail.com`)
   - Password: Strong password (save it securely)
   - Country/Region: United States (or your region)
   - Skip all optional fields
5. Click "Invite"
6. **Do NOT verify email** - sandbox accounts don't need verification

### Sandbox Subscription Durations

Sandbox subscriptions auto-renew much faster for testing:

| Production Duration | Sandbox Duration |
|---------------------|------------------|
| 1 week | 3 minutes |
| 1 month | 5 minutes |
| 2 months | 10 minutes |
| 3 months | 15 minutes |
| 6 months | 30 minutes |
| 1 year | 1 hour |

**Auto-renewal limit**: Sandbox subscriptions auto-renew up to **6 times** total (30 minutes for monthly), then expire.

### Test Scenarios

#### Test 1: Purchase and Renewal

1. **Setup**:
   - Sign out of App Store on test device
   - Install Chravel app

2. **Purchase**:
   - Open paywall in app
   - Select Explorer Monthly
   - Tap "Subscribe to Explorer"
   - When prompted, sign in with sandbox Apple ID
   - Confirm purchase (it's free in sandbox)

3. **Verify Initial Purchase**:
   - Subscription activates immediately
   - Check RevenueCat dashboard: Customer should appear
   - Check Supabase: `user_entitlements` row created with plan='explorer'
   - Check app UI: Premium features unlocked

4. **Wait for Renewal** (5 minutes):
   - Keep app open or running in background
   - After 5 minutes, subscription auto-renews
   - Check RevenueCat: New transaction appears
   - Entitlement remains active

5. **Observe Auto-Expiry** (30 minutes total):
   - After 6 renewals, subscription expires
   - Check app: Premium features locked
   - Check Supabase: status='expired'

#### Test 2: Cancellation

1. **Purchase subscription** (as above)
2. **Cancel subscription**:
   - Open Settings app on device
   - Tap your profile at top
   - Tap "Subscriptions"
   - Find Chravel subscription
   - Tap "Cancel Subscription"
3. **Verify**:
   - Subscription remains active until period end
   - After 5 minutes (sandbox duration), expires
   - Premium features locked
   - Supabase status='canceled' or 'expired'

#### Test 3: Upgrade

1. **Purchase Explorer Monthly** (as above)
2. **Upgrade to Frequent Chraveler**:
   - Open paywall again
   - Select Frequent Chraveler Monthly
   - Tap "Subscribe to Frequent Chraveler"
   - Confirm upgrade
3. **Verify**:
   - Upgrade is immediate (prorated)
   - RevenueCat shows new entitlement
   - Supabase plan='frequent-chraveler'
   - App unlocks Frequent Chraveler features

#### Test 4: Downgrade

1. **Purchase Frequent Chraveler Monthly**
2. **Downgrade to Explorer**:
   - Open paywall
   - Select Explorer Monthly
   - Confirm downgrade
3. **Verify**:
   - Frequent Chraveler remains active until period end
   - After 5 minutes, downgrades to Explorer
   - RevenueCat and Supabase update

#### Test 5: Refund

1. **Purchase subscription**
2. **Request refund**:
   - Go to https://reportaproblem.apple.com
   - Sign in with sandbox Apple ID
   - Find the subscription purchase
   - Select "Request a refund"
   - Choose reason, submit
3. **Verify**:
   - Entitlement revoked immediately (with Server Notifications)
   - App locks premium features
   - Supabase status='refunded' or 'expired'

#### Test 6: Billing Issue / Grace Period

1. **Purchase subscription**
2. **Simulate billing issue**:
   - In sandbox, Apple automatically simulates this after some renewals
   - Look for "Billing Retry" state in RevenueCat
3. **Verify**:
   - User enters grace period (still has access)
   - After grace period expires, access revoked
   - Notification sent to user (if push notifications configured)

### Sandbox Testing Best Practices

- **Use multiple sandbox accounts** for different scenarios
- **Clear purchase history** between tests (Settings → Apple ID → Subscriptions → Manage)
- **Monitor RevenueCat dashboard** for real-time updates
- **Check Supabase logs** to verify sync function calls
- **Test on real device** (not just simulator) for production-like behavior
- **Wait full sandbox duration** to observe auto-renewals

---

## 7. Verify Supabase Entitlement Sync

### Implementation Status

✅ **Already Implemented** - No code changes needed

The Supabase sync is fully implemented:

#### Edge Function
- **File**: `supabase/functions/sync-revenuecat-entitlement/index.ts`
- **Endpoint**: `https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/sync-revenuecat-entitlement`
- **Authentication**: Required (user JWT token)

#### Client-Side Trigger
- **File**: `src/hooks/useEntitlementsSync.ts`
- **When**: Runs automatically on user login
- **Platform**: iOS and web (when RevenueCat is available)

#### Database Table
- **Table**: `user_entitlements`
- **Schema**:
  ```sql
  CREATE TABLE user_entitlements (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    source TEXT NOT NULL, -- 'revenuecat', 'stripe', 'manual'
    plan TEXT NOT NULL, -- 'free', 'explorer', 'frequent-chraveler', etc.
    status TEXT NOT NULL, -- 'active', 'trialing', 'canceled', 'expired'
    current_period_end TIMESTAMPTZ,
    entitlements TEXT[], -- Array of entitlement IDs
    revenuecat_customer_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### Sync Flow

1. **User logs in** → `useAuth` hook fires
2. **Entitlement sync triggered** → `useEntitlementsSync` hook runs
3. **RevenueCat configured** → `configureRevenueCat(userId)` called (iOS only)
4. **Customer info fetched** → `getCustomerInfo()` from RevenueCat
5. **Sync to Supabase** → POST to `sync-revenuecat-entitlement` edge function
6. **Database updated** → `user_entitlements` table upserted
7. **App state updated** → `entitlementsStore.refreshEntitlements(userId)`
8. **UI reflects entitlements** → Premium features unlocked/locked

### Manual Sync (for testing)

You can manually trigger sync from iOS app:

```swift
// In Xcode console or app code
Task {
    do {
        let customerInfo = try await Purchases.shared.customerInfo()
        // Call Supabase function manually
        print("Customer info:", customerInfo)
    } catch {
        print("Error:", error)
    }
}
```

Or from web console:

```javascript
// Browser console
const { data, error } = await supabase.functions.invoke('sync-revenuecat-entitlement', {
  body: { customerInfo: { /* data from RevenueCat */ } }
});
console.log('Sync result:', data);
```

### Verify Sync Working

#### Check Database

```sql
-- Run in Supabase SQL Editor
SELECT
  user_id,
  source,
  plan,
  status,
  entitlements,
  current_period_end,
  updated_at
FROM user_entitlements
WHERE source = 'revenuecat'
ORDER BY updated_at DESC
LIMIT 10;
```

Expected result after purchase:
```
user_id | source | plan | status | entitlements | current_period_end | updated_at
--------|--------|------|--------|--------------|--------------------|-----------
abc123  | revenuecat | explorer | active | {chravel_explorer} | 2026-02-19 | 2026-01-19 18:00:00
```

#### Check Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions → `sync-revenuecat-entitlement`
2. Click "Logs"
3. Look for recent invocations
4. Check for errors or successful syncs

Example log output:
```
[sync-rc] Syncing entitlements for user: abc123-def456-...
[sync-rc] Active entitlements: chravel_explorer
[sync-rc] Successfully synced: { plan: 'explorer', status: 'active', entitlements: ['chravel_explorer'] }
```

#### Check RevenueCat Dashboard

1. Go to RevenueCat Dashboard → Customers
2. Search for your Supabase user ID
3. Verify:
   - Customer exists
   - Correct entitlements active
   - Purchase history visible
   - App User ID matches Supabase user ID

### Troubleshooting Sync Issues

**Sync not triggering**:
- Check `useEntitlementsSync` hook is mounted in app
- Verify RevenueCat API key is correct
- Check console for JavaScript errors

**Sync fails with 401 Unauthorized**:
- Verify user is authenticated
- Check Supabase JWT token is valid
- Ensure edge function has `verify_jwt = true` in config

**Database not updating**:
- Check RLS policies on `user_entitlements` table
- Verify service role key is configured in edge function
- Check edge function logs for errors

**Entitlements not matching**:
- Verify entitlement IDs are identical in:
  - RevenueCat dashboard
  - `SubscriptionManager.swift`
  - `revenuecat.ts`
  - `sync-revenuecat-entitlement/index.ts`
- Check for typos or case mismatches

---

## 8. Final Pre-Submission Checklist

Before proceeding to Sprint 4, verify:

### App Store Connect
- [ ] 4 subscription products created and approved
- [ ] Products have correct IDs (com.chravel.explorer.*, com.chravel.frequentchraveler.*)
- [ ] Subscription group configured and ranked
- [ ] Introductory offers configured (optional)
- [ ] Products submitted for review with app binary

### RevenueCat Dashboard
- [ ] Production API key generated and saved
- [ ] 2 entitlements created (chravel_explorer, chravel_frequent_chraveler)
- [ ] Entitlement IDs match codebase exactly
- [ ] "Current" offering created and set as default
- [ ] 4 packages added to Current offering
- [ ] Packages linked to correct products and entitlements
- [ ] App Store Server Notifications V2 enabled
- [ ] Webhook URL configured in App Store Connect
- [ ] Test notification sent and received

### Code Configuration
- [ ] Production RevenueCat API key replaced in `AppDelegate.swift`
- [ ] Log level set to `.warn` or `.error` in production
- [ ] Product IDs consistent across all files
- [ ] Entitlement IDs consistent across all files

### Testing
- [ ] Sandbox Apple ID created and saved
- [ ] Purchased Explorer Monthly in sandbox (success)
- [ ] Subscription renewed automatically (observed)
- [ ] Canceled subscription (behaves correctly)
- [ ] Upgraded from Explorer to Frequent Chraveler (immediate)
- [ ] Downgraded from Frequent Chraveler to Explorer (end of period)
- [ ] Restored purchases on new device (success)
- [ ] "No purchases to restore" shown for new user (correct)

### Supabase Integration
- [ ] Edge function `sync-revenuecat-entitlement` deployed
- [ ] Edge function logs show successful syncs
- [ ] `user_entitlements` table populated after purchase
- [ ] Entitlements update on renewal
- [ ] Entitlements revoked on expiry/refund
- [ ] Plan priority logic working (highest tier takes precedence)

### User Experience
- [ ] Paywall displays correctly with pricing
- [ ] "Restore Purchases" button visible and functional
- [ ] Success/error messages shown appropriately
- [ ] Subscription status visible in app settings
- [ ] Premium features gated correctly based on entitlements
- [ ] Graceful degradation when RevenueCat unavailable

---

## 9. Known Manual Configurations

The following require manual setup in external dashboards:

### App Store Connect
- [ ] Create 4 subscription products (see section 1)
- [ ] Submit products for App Review
- [ ] Configure subscription group settings
- [ ] Enable App Store Server Notifications (see section 4)
- [ ] Add webhook URL for RevenueCat

### RevenueCat Dashboard
- [ ] Generate production API key (Sprint 1)
- [ ] Create 2 entitlements (see section 2)
- [ ] Create "Current" offering with 4 packages (see section 3)
- [ ] Configure webhook for Supabase (optional, for custom sync)
- [ ] Set up Charts for analytics (optional)

### Supabase Dashboard
- [ ] Verify `user_entitlements` table exists
- [ ] Check RLS policies allow sync function to upsert
- [ ] Monitor edge function logs during testing
- [ ] Configure alerts for sync failures (optional)

### Testing
- [ ] Create multiple sandbox Apple IDs for testing
- [ ] Test all lifecycle scenarios (section 6)
- [ ] Verify sync working end-to-end (section 7)
- [ ] Test on physical device (not just simulator)

---

## 10. Post-Launch Monitoring

After app is live in App Store, monitor:

### RevenueCat Dashboard
- **Overview**: Active subscriptions, MRR (Monthly Recurring Revenue), churn rate
- **Charts**: Conversion funnel, subscription retention, revenue trends
- **Customers**: Individual subscriber details, purchase history
- **Events**: Real-time subscription events (renewals, cancellations, refunds)

### Supabase
- **Edge Function Logs**: Monitor `sync-revenuecat-entitlement` for errors
- **Database Queries**: Check for orphaned entitlements or sync issues
- **Performance**: Ensure sync function completes quickly (<2s)

### App Store Connect
- **Subscription Reports**: Download monthly reports for accounting
- **Customer Reviews**: Monitor for subscription-related complaints
- **Refund Requests**: Track refund rates and reasons

### Recommended Alerts

Set up alerts for:
- **High refund rate** (>5% in a month)
- **Sync failures** (edge function errors)
- **Subscription cancellations spike**
- **New subscriber conversion drop**

---

## Next Steps

Once all manual configurations are complete:
1. Test end-to-end subscription flow on TestFlight
2. Verify all entitlements sync correctly to Supabase
3. Test paywall UI on multiple device sizes
4. Proceed to **Sprint 4: Stability & Correctness**

---

## Support Resources

- **RevenueCat Documentation**: https://www.revenuecat.com/docs
- **App Store Subscriptions Guide**: https://developer.apple.com/app-store/subscriptions/
- **RevenueCat Support**: https://community.revenuecat.com
- **Sandbox Testing Guide**: https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox
- **Server Notifications**: https://developer.apple.com/documentation/appstoreservernotifications

## Questions or Issues?

If you encounter issues:
1. Check RevenueCat status page: https://status.revenuecat.com
2. Review App Store Connect subscription setup guide
3. Test with sandbox account before production
4. Monitor edge function logs for sync errors
5. Consult docs/APP_STORE_PLAN.md for full context
