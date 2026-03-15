# Share Extension — External Setup Requirements

**Feature:** Native iOS Share Extension ("Share to Chravel")
**Bundle ID (extension):** `com.chravel.app.share-extension`
**Bundle ID (main app):** `com.chravel.app`
**App Group ID:** `group.com.chravel.app`
**Target:** iOS 15.0+
**Last Updated:** 2026-03-15

---

## Overview

The Share Extension allows users to share content from Safari, Photos, Notes, Maps, Mail, Messages, and other apps directly into their Chravel trips via the iOS system share sheet. All code has been written and committed — this document covers the **external configuration steps** that must be completed in the Apple Developer Portal and Xcode before the extension will work.

---

## What's Already Done (No Action Needed)

The following are already implemented in the codebase:

- [x] Share Extension Swift source code (`ios/App/ChravelShareExtension/`)
- [x] Shared models library (`ios/App/SharedModels/`)
- [x] Capacitor plugin bridge (`ios/App/App/ChravelShareBridge.swift`)
- [x] Extension entitlements file (`ios/App/ChravelShareExtension/ChravelShareExtension.entitlements`)
- [x] Main app entitlements updated with App Group (`ios/App/App/App.entitlements`)
- [x] Extension Info.plist with activation rules (`ios/App/ChravelShareExtension/Info.plist`)
- [x] Web-side ingestion service (`src/features/share-extension/`)
- [x] Supabase migration for `shared_inbound_items` table
- [x] Telemetry events (11 share extension events)
- [x] Deep link routing for "Open in Chravel" post-share
- [x] Unit tests (37 passing)

---

## Step 1: Apple Developer Portal — App Group

**Why:** The Share Extension and main app need a shared container to exchange data (pending shares, auth state, trip cache).

1. Log in to [Apple Developer Portal](https://developer.apple.com/account)
2. Go to **Certificates, Identifiers & Profiles → Identifiers**
3. Click the **+** button → Select **App Groups** → Continue
4. Enter:
   - **Description:** `Chravel App Group`
   - **Identifier:** `group.com.chravel.app`
5. Click **Continue** → **Register**

### Add App Group to Main App Identifier

1. Go to **Identifiers** → Find `com.chravel.app`
2. Click to edit → Enable **App Groups** capability
3. Select `group.com.chravel.app`
4. Click **Save**

---

## Step 2: Apple Developer Portal — Extension App ID

**Why:** The Share Extension is a separate binary and needs its own App ID and provisioning profile.

1. Go to **Identifiers** → Click **+** → Select **App IDs** → Continue
2. Select **App** (not App Clip) → Continue
3. Enter:
   - **Description:** `Chravel Share Extension`
   - **Bundle ID:** `com.chravel.app.share-extension` (Explicit)
4. Under **Capabilities**, enable:
   - **App Groups** → Select `group.com.chravel.app`
5. Click **Continue** → **Register**

---

## Step 3: Apple Developer Portal — Provisioning Profiles

**Why:** Both targets need valid provisioning profiles that include the App Group entitlement.

### Main App Profile (Update Existing)

1. Go to **Profiles** → Find the existing `com.chravel.app` Distribution profile
2. Click **Edit** (or create new if needed)
3. Ensure the profile includes the **App Groups** capability
4. Download and install the updated profile

### Share Extension Profile (Create New)

1. Go to **Profiles** → Click **+**
2. Select **App Store Connect** (under Distribution) → Continue
3. Select App ID: `com.chravel.app.share-extension` → Continue
4. Select Distribution Certificate → Continue
5. Enter Profile Name: `Chravel Share Extension Distribution`
6. Click **Generate** → Download

> **Note for TestFlight:** You'll also need Development/Ad Hoc profiles for the extension if testing via TestFlight before App Store submission.

---

## Step 4: Xcode — Add Share Extension Target

**Why:** The extension is a separate build target that must be added to the Xcode project.

1. Open `ios/App/App.xcodeproj` in Xcode
2. Go to **File → New → Target**
3. Select **iOS → Share Extension** → Next
4. Configure:
   - **Product Name:** `ChravelShareExtension`
   - **Team:** (Your Apple Developer Team)
   - **Organization Identifier:** `com.chravel.app`
   - **Bundle Identifier:** `com.chravel.app.share-extension` (auto-filled)
   - **Language:** Swift
   - **Embed in Application:** App
5. Click **Finish**
6. When prompted to activate the scheme, click **Activate**

### Configure the Extension Target

1. Select the `ChravelShareExtension` target in the project navigator
2. **General tab:**
   - Deployment Target: **iOS 15.0**
   - Bundle Identifier: `com.chravel.app.share-extension`
3. **Signing & Capabilities tab:**
   - Team: (Your team)
   - Signing Certificate: Distribution
   - Provisioning Profile: Select `Chravel Share Extension Distribution`
   - Click **+ Capability** → **App Groups** → Add `group.com.chravel.app`
4. **Build Settings:**
   - `MARKETING_VERSION`: Match the main app version (e.g., `1.0.0`)
   - `CURRENT_PROJECT_VERSION`: Match the main app build number

---

## Step 5: Xcode — Add Source Files to Targets

**Why:** The Swift files are already in the repo but need to be explicitly added to the correct Xcode targets.

### Files for the Share Extension Target ONLY:

Add these to the `ChravelShareExtension` target membership:
- `ios/App/ChravelShareExtension/ShareViewController.swift`
- `ios/App/ChravelShareExtension/ShareComposerView.swift`
- `ios/App/ChravelShareExtension/ShareComposerViewModel.swift`

### Files for BOTH Targets (Main App + Extension):

Add these to BOTH `App` and `ChravelShareExtension` target membership:
- `ios/App/SharedModels/SharedInboundItem.swift`
- `ios/App/SharedModels/ContentRouter.swift`
- `ios/App/SharedModels/DedupeEngine.swift`
- `ios/App/SharedModels/SharePersistence.swift`
- `ios/App/SharedModels/AuthBridge.swift`
- `ios/App/SharedModels/TripInfo.swift`

### Files for the Main App Target ONLY:

Add this to the `App` target membership:
- `ios/App/App/ChravelShareBridge.swift` (Capacitor plugin — already in App target)

### How to Add Target Membership:

1. Select each file in the Xcode project navigator
2. Open the **File Inspector** (right panel → first tab)
3. Under **Target Membership**, check the appropriate target(s)

---

## Step 6: Xcode — Configure Extension Entry Point

**Why:** Xcode auto-generates a storyboard-based entry point. We use a custom `ShareViewController` instead.

### Option A: Replace the storyboard reference (Recommended)

1. In `ios/App/ChravelShareExtension/Info.plist`, the entry is already set:
   ```xml
   <key>NSExtensionMainStoryboard</key>
   <string>MainInterface</string>
   ```
2. Delete the auto-generated `MainInterface.storyboard` from the extension target
3. Change the Info.plist entry to use the principal class instead:
   ```xml
   <!-- REMOVE this line: -->
   <key>NSExtensionMainStoryboard</key>
   <string>MainInterface</string>

   <!-- ADD this line instead: -->
   <key>NSExtensionPrincipalClass</key>
   <string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
   ```

### Option B: Keep the storyboard

1. Open the auto-generated `MainInterface.storyboard`
2. Set the view controller's **Custom Class** to `ShareViewController`
3. Set **Module** to `ChravelShareExtension`

> **Recommendation:** Use Option A (principal class) — it's simpler and avoids storyboard maintenance.

---

## Step 7: Xcode — Update Main App Signing

**Why:** The main app's provisioning profile must also include the App Group.

1. Select the **App** target
2. **Signing & Capabilities** tab
3. Verify **App Groups** capability is present with `group.com.chravel.app`
4. If not, click **+ Capability** → **App Groups** → Add `group.com.chravel.app`
5. Ensure the provisioning profile is the updated one from Step 3

---

## Step 8: Xcode — Add CryptoKit Framework

**Why:** The `DedupeEngine.swift` uses `CryptoKit` for SHA256 fingerprinting.

1. Select the `ChravelShareExtension` target
2. **General tab → Frameworks, Libraries, and Embedded Content**
3. Click **+** → Search for `CryptoKit` → Add
4. Set embed to **Do Not Embed** (it's a system framework)

> **Note:** CryptoKit is available on iOS 13+, so no compatibility issues with our iOS 15 target.

---

## Step 9: Supabase — Run Migration

**Why:** The `shared_inbound_items` table must exist before the web app can process shared content.

1. Apply the migration at `supabase/migrations/20260406000000_add_shared_inbound_items.sql`
2. Run: `npx supabase db push` (if using Supabase CLI)
3. Or apply manually via Supabase Dashboard → SQL Editor

### Verification

After running the migration, verify:
- Table `shared_inbound_items` exists
- RLS is enabled (4 policies: select, insert, update, delete — all scoped to `auth.uid() = user_id`)
- Indexes exist: `idx_shared_inbound_items_user_trip`, `idx_shared_inbound_items_pending`, `idx_shared_inbound_items_dedupe`
- Trigger `trigger_shared_inbound_items_updated_at` is active

---

## Step 10: Build & Test

### Build Verification

```bash
# 1. Build web assets
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. Select "App" scheme → Build (Cmd+B)
# 5. Select "ChravelShareExtension" scheme → Build (Cmd+B)
# Both must build without errors.
```

### Test the Share Extension

1. Run the app on a device or simulator
2. Sign in and create/join at least one trip
3. Open Safari, navigate to any URL
4. Tap the **Share** button
5. Look for **Chravel** in the share sheet (may need to scroll or tap "More")
6. Verify:
   - Extension opens with the correct URL preview
   - Trips are listed (from cache)
   - Destination auto-suggests "Explore Links" for URLs
   - Tapping Save queues the item
   - Returning to Chravel processes the queued item
   - The URL appears in the trip's Explore Links

### Test Matrix

| Source App | Content Type | Expected Destination | Priority |
|-----------|-------------|---------------------|----------|
| Safari | Web URL | Explore Links | P0 |
| Safari | Article URL | Explore Links | P0 |
| Photos | Single image | Concierge | P0 |
| Notes | Plain text | Chat | P1 |
| Maps | Location URL | Explore Links | P1 |
| Files | PDF document | Concierge | P1 |
| Messages | Shared link | Explore Links | P1 |
| Mail | Forwarded text | Chat or Concierge | P2 |
| Photos | Multiple images | Concierge | P2 |

---

## Troubleshooting

### Extension not appearing in share sheet

- Ensure the extension target builds successfully
- Check that the extension is embedded in the main app (Target → General → Embedded Content)
- Reset the simulator: Device → Erase All Content and Settings
- On device: restart the device after installing

### "App Group container not available" error

- Verify both targets have the same App Group identifier: `group.com.chravel.app`
- Verify the App Group is registered in Apple Developer Portal
- Verify provisioning profiles include the App Group entitlement
- Clean build folder (Cmd+Shift+K) and rebuild

### Extension crashes on launch

- Check Xcode console for the extension process logs (filter by `ChravelShareExtension`)
- Ensure `ShareViewController` is set as the principal class or storyboard entry point
- Verify all SharedModels files have target membership in the extension target

### No trips showing in extension

- Ensure the main app has been opened at least once after sign-in
- The trip cache syncs when the main app loads trips
- Check `UserDefaults(suiteName: "group.com.chravel.app")` has data

### Shared items not processing in main app

- Check browser console for errors from `useShareExtensionIngestion`
- Verify the `ChravelShareBridge` Capacitor plugin is registered
- Check that `shared_inbound_items` table exists and RLS policies are correct

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    iOS System Share Sheet                        │
│                                                                 │
│  Safari  Photos  Notes  Maps  Files  Messages  Mail  ...       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ User taps "Chravel"
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              ChravelShareExtension (SwiftUI)                    │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ Content  │  │   Trip    │  │ Destination │  │   Note    │  │
│  │ Preview  │  │  Picker   │  │  Selector   │  │   Field   │  │
│  └──────────┘  └───────────┘  └─────────────┘  └───────────┘  │
│                                                                 │
│  SharedModels: ContentRouter → DedupeEngine → SharePersistence │
│                                                                 │
│  Saves to: App Group Shared Container (JSON files)             │
└──────────────────────┬──────────────────────────────────────────┘
                       │ On app resume / deep link
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Main Chravel App (Capacitor)                  │
│                                                                 │
│  ChravelShareBridge ──→ useShareExtensionIngestion hook        │
│  (Capacitor plugin)      (reads pending items)                  │
│                              │                                  │
│                              ▼                                  │
│                    shareIngestionService                         │
│                    ┌─────────┬──────────┐                       │
│                    │         │          │                        │
│                    ▼         ▼          ▼                        │
│              Explore     Trip Chat   Trip Tasks                 │
│              Links       Messages    Calendar                   │
│                          Concierge                              │
│                              │                                  │
│                              ▼                                  │
│                     Supabase (shared_inbound_items + target)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Reference

| File | Target | Purpose |
|------|--------|---------|
| `ios/App/ChravelShareExtension/ShareViewController.swift` | Extension | UIKit entry point, hosts SwiftUI |
| `ios/App/ChravelShareExtension/ShareComposerView.swift` | Extension | SwiftUI UI (dark/gold theme) |
| `ios/App/ChravelShareExtension/ShareComposerViewModel.swift` | Extension | Content parsing, routing, save logic |
| `ios/App/ChravelShareExtension/Info.plist` | Extension | Activation rules, extension config |
| `ios/App/ChravelShareExtension/ChravelShareExtension.entitlements` | Extension | App Group entitlement |
| `ios/App/SharedModels/SharedInboundItem.swift` | Both | Core data models |
| `ios/App/SharedModels/ContentRouter.swift` | Both | Routing engine |
| `ios/App/SharedModels/DedupeEngine.swift` | Both | Fingerprinting / dedup |
| `ios/App/SharedModels/SharePersistence.swift` | Both | App Group file I/O |
| `ios/App/SharedModels/AuthBridge.swift` | Both | Auth state sharing |
| `ios/App/SharedModels/TripInfo.swift` | Both | Trip cache |
| `ios/App/App/ChravelShareBridge.swift` | Main App | Capacitor plugin |
| `ios/App/App/App.entitlements` | Main App | Updated with App Group |
| `src/features/share-extension/` | Web | Ingestion service, hooks, types |
| `supabase/migrations/20260406000000_*.sql` | Backend | Database table + RLS |

---

## App Store Review Notes

When submitting to App Store Review, add the following to the review notes:

> **Share Extension:** Chravel includes a Share Extension that allows users to share URLs, text, images, and files from other apps into their trip plans. To test: Open Safari, navigate to any webpage, tap Share, select Chravel, choose a trip, and tap Save. The shared content will appear in the selected trip's destination (Explore Links for URLs, Chat for text, etc.).

---

_Last Updated: 2026-03-15 · Created by: AI Engineering Team_
