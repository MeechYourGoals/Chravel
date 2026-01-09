# RevenueCat iOS Integration Guide

## Overview

This document provides step-by-step instructions for completing the RevenueCat integration for ChravelApp iOS in-app purchases.

## Files Created

```
ios/App/App/RevenueCat/
├── SubscriptionManager.swift   # Core subscription management singleton
├── PaywallView.swift           # Custom paywall UI with tier selection
├── CustomerCenterView.swift    # Subscription management UI
├── SubscriptionButton.swift    # Reusable UI components
└── EntitlementChecker.swift    # Entitlement checking utilities
```

## Configuration

### 1. AppDelegate.swift

The AppDelegate has been updated to:
- Import RevenueCat
- Configure the SDK with your API key: `test_QqVXiOnWgmxTHaMKTUiCrOpYMDm`
- Enable attribution tracking

### 2. Product Configuration

| Product ID | Tier | Price | Billing |
|------------|------|-------|---------|
| `com.chravel.explorer.monthly` | Explorer | $9.99 | Monthly |
| `com.chravel.explorer.annual` | Explorer | $99.00 | Annual (17% off) |
| `com.chravel.frequentchraveler.monthly` | Frequent Chraveler | $19.99 | Monthly |
| `com.chravel.frequentchraveler.annual` | Frequent Chraveler | $199.00 | Annual (17% off) |

### 3. Entitlement IDs

| Entitlement ID | Tier | Features |
|----------------|------|----------|
| `chravel_explorer` | Explorer | Extended AI (100/mo), 25 trips, PDF export, Calendar sync |
| `chravel_frequent_chraveler` | Frequent Chraveler | Unlimited everything, Pro trips, Events (100 attendees) |

---

## Xcode Setup Steps

### Step 1: Add RevenueCat Swift Package

1. Open `ios/App/App.xcodeproj` in Xcode
2. Go to **File → Add Package Dependencies**
3. Enter URL: `https://github.com/RevenueCat/purchases-ios-spm.git`
4. Select version rule: **Up to Next Major Version** from `5.0.0`
5. Click **Add Package**
6. Select these products to add:
   - `RevenueCat`
   - `RevenueCatUI`
7. Click **Add Package**

### Step 2: Add Swift Files to Xcode Project

1. In Xcode, right-click on the `App` folder in the navigator
2. Select **Add Files to "App"...**
3. Navigate to `ios/App/App/RevenueCat/`
4. Select all 5 Swift files:
   - `SubscriptionManager.swift`
   - `PaywallView.swift`
   - `CustomerCenterView.swift`
   - `SubscriptionButton.swift`
   - `EntitlementChecker.swift`
5. Ensure **"Copy items if needed"** is unchecked
6. Ensure **"Create folder references"** is selected
7. Click **Add**

### Step 3: Verify Build

1. Select the App target
2. Click **Build** (⌘B) to verify there are no errors
3. Fix any import issues if they arise

---

## RevenueCat Dashboard Setup

### Page 1: Install the SDK (Current Page)

✅ **Already completed in code!**

Click **"I'm ready!"** to proceed.

### Page 2: Connect to App Store Connect

1. Go to **Project Settings → Apps → iOS App**
2. Click **"App Store Connect"** section
3. Enter your **App-Specific Shared Secret**:
   - In App Store Connect, go to **Apps → [Your App] → App Information**
   - Scroll to **App-Specific Shared Secret** and generate if needed
   - Copy and paste into RevenueCat
4. Upload your **App Store Connect API Key** (for server notifications):
   - In App Store Connect, go to **Users and Access → Keys**
   - Generate a new API key with "App Manager" role
   - Download the `.p8` file and upload to RevenueCat

### Page 3: Create Products

**For each product, create in App Store Connect first:**

1. **In App Store Connect:**
   - Go to **Apps → [Your App] → Subscriptions**
   - Create a **Subscription Group** called "Chravel Subscriptions"
   - Add products:

   | Reference Name | Product ID | Price | Duration |
   |----------------|------------|-------|----------|
   | Explorer Monthly | `com.chravel.explorer.monthly` | $9.99 | 1 Month |
   | Explorer Annual | `com.chravel.explorer.annual` | $99.00 | 1 Year |
   | Frequent Chraveler Monthly | `com.chravel.frequentchraveler.monthly` | $19.99 | 1 Month |
   | Frequent Chraveler Annual | `com.chravel.frequentchraveler.annual` | $199.00 | 1 Year |

2. **In RevenueCat:**
   - Go to **Products**
   - Click **+ New**
   - For each product:
     - **Identifier**: Same as App Store Product ID
     - **App Store Product ID**: Same identifier
   - Click **Save**

### Page 4: Create Entitlements

1. Go to **Entitlements** in RevenueCat
2. Click **+ New**
3. Create entitlements:

   | Identifier | Products |
   |------------|----------|
   | `chravel_explorer` | `com.chravel.explorer.monthly`, `com.chravel.explorer.annual` |
   | `chravel_frequent_chraveler` | `com.chravel.frequentchraveler.monthly`, `com.chravel.frequentchraveler.annual` |

4. For each entitlement, attach the corresponding products

### Page 5: Create Offerings

1. Go to **Offerings** in RevenueCat
2. The **default** offering is created automatically
3. Click on **default** offering
4. Create **Packages**:

   | Package Type | Product |
   |--------------|---------|
   | Monthly | `com.chravel.explorer.monthly` |
   | Annual | `com.chravel.explorer.annual` |
   | Custom: `frequent_chraveler_monthly` | `com.chravel.frequentchraveler.monthly` |
   | Custom: `frequent_chraveler_annual` | `com.chravel.frequentchraveler.annual` |

### Page 6: Configure Paywalls (Optional)

1. Go to **Paywalls** in RevenueCat
2. Click **Create New Paywall**
3. Select a template or use the **Footer** template
4. Customize with:
   - Header: "Upgrade to Chravel Pro"
   - Description: "Unlock all features and travel smarter"
   - Colors: Blue (#3B82F6) and Purple (#8B5CF6)
5. Attach to the **default** offering

### Page 7: Enable Server Notifications (Important!)

1. Go to **Project Settings → Apps → iOS App**
2. Copy the **Apple Server Notification URL**
3. In App Store Connect:
   - Go to **Apps → [Your App] → App Information**
   - Scroll to **App Store Server Notifications**
   - Enter the RevenueCat URL for both:
     - Production Server URL
     - Sandbox Server URL
   - Select **Version 2 Notifications**

### Page 8: Test Purchases

1. Create a **Sandbox Tester** in App Store Connect:
   - Go to **Users and Access → Sandbox Testers**
   - Click **+** and create a test account
2. On your test device:
   - Sign out of your Apple ID in **Settings → App Store**
   - Run the app from Xcode
   - When prompted to purchase, sign in with sandbox tester
3. Test both monthly and annual purchases
4. Verify entitlements appear in RevenueCat dashboard

---

## Usage in SwiftUI Views

### Display Paywall

```swift
import SwiftUI

struct SettingsView: View {
    @State private var showPaywall = false
    
    var body: some View {
        Button("Upgrade to Pro") {
            showPaywall = true
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
    }
}
```

### Check Entitlements

```swift
// Using the property wrapper
struct MyView: View {
    @RequiresEntitlement(.explorer) var hasExplorer
    
    var body: some View {
        if hasExplorer {
            Text("You have Explorer access!")
        } else {
            UpgradeButton()
        }
    }
}

// Using static checks
if EntitlementChecker.canExportPDF {
    exportPDF()
}
```

### Gate Features

```swift
PremiumContent()
    .requiresSubscription(.frequentChraveler, featureName: "Pro Trips")
```

### Show Customer Center

```swift
@State private var showCustomerCenter = false

Button("Manage Subscription") {
    showCustomerCenter = true
}
.sheet(isPresented: $showCustomerCenter) {
    CustomerCenterView()
}
```

### Subscription Status Banner

```swift
// Add to settings or profile screen
SubscriptionStatusBanner()
```

---

## Syncing with Supabase

To sync RevenueCat entitlements with your Supabase backend:

1. **Set up RevenueCat Webhooks:**
   - Go to **Project Settings → Integrations → Webhooks**
   - Add your Supabase Edge Function URL: `https://[project-ref].supabase.co/functions/v1/sync-revenuecat-entitlement`

2. **The webhook payload includes:**
   ```json
   {
     "event": {
       "type": "INITIAL_PURCHASE",
       "app_user_id": "supabase-user-id",
       "product_id": "com.chravel.explorer.monthly",
       "entitlement_ids": ["chravel_explorer"]
     }
   }
   ```

3. **Your edge function already handles this** in `sync-revenuecat-entitlement`

---

## Production Checklist

Before App Store submission:

- [ ] Replace test API key with production key
- [ ] Set `Purchases.logLevel = .warn` in AppDelegate
- [ ] Verify all products are approved in App Store Connect
- [ ] Test sandbox purchases work correctly
- [ ] Verify entitlements sync to Supabase
- [ ] Configure App Store Server Notifications
- [ ] Add subscription terms to app description
- [ ] Include restore purchases button (already in PaywallView)
- [ ] Test upgrade/downgrade flows
- [ ] Test cancellation and resubscription

---

## Support

- RevenueCat Docs: https://www.revenuecat.com/docs
- RevenueCat Discord: https://discord.gg/revenuecat
- Apple IAP Guide: https://developer.apple.com/in-app-purchase/
