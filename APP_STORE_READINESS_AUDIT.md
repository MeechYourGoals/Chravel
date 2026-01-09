# App Store Launch Readiness Audit
## Chravel - Group Travel & Event Platform
**Audit Date:** January 9, 2026
**Auditor:** Senior Mobile Lead + Release Engineer
**Platform:** Capacitor 8.0.0 + React 18 + Supabase + RevenueCat

---

## 1) EXECUTIVE SUMMARY

### Launch Readiness Score: **78/100**

The Chravel iOS app is **substantially complete** with robust core features, professional-grade architecture, and comprehensive App Store metadata. However, several **critical blockers** must be addressed before App Store submission.

### Top 10 Blockers (Ranked by Risk)

| Priority | Blocker | Risk | Impact |
|----------|---------|------|--------|
| **P0** | RevenueCat using TEST API key | CRITICAL | Purchases will fail in production |
| **P0** | Push notification entitlement = "development" | CRITICAL | APNs will reject production tokens |
| **P0** | Apple Team ID not configured | CRITICAL | Universal Links won't work |
| **P0** | App Store Connect products not created | CRITICAL | No subscriptions available to purchase |
| **P1** | Account deletion RPC not implemented | HIGH | App Store rejection (Guideline 5.1.1) |
| **P1** | OAuth UI buttons not rendered | HIGH | Users can't use Google/Apple sign-in |
| **P1** | APNs certificate not configured | HIGH | Push notifications won't work |
| **P1** | No App Tracking Transparency | MEDIUM | Potential compliance issue |
| **P2** | Coverage thresholds not enforced | MEDIUM | Quality regression risk |
| **P2** | Hardcoded Supabase anon key | LOW | Best practice violation |

### Estimated Critical Path (Engineering Days)

| Phase | Tasks | Effort | Assumptions |
|-------|-------|--------|-------------|
| **Day 1-2** | P0 blockers (RevenueCat prod key, APNs setup, Team ID, entitlements) | 2 days | [Apple Developer access, RevenueCat dashboard access] |
| **Day 3** | App Store Connect setup (products, screenshots, metadata) | 1 day | [App Store Connect access, banking info ready] |
| **Day 4** | P1 blockers (Account deletion, OAuth UI, ATT) | 1 day | [Supabase admin access for RPC] |
| **Day 5** | Testing & QA (sandbox purchases, deep links, push) | 1 day | [iOS device, sandbox tester account] |
| **Day 6** | Submit for review | 0.5 day | [All previous items complete] |

**Total: ~5.5 engineering days** assuming all external dependencies (Apple accounts, banking, API keys) are ready.

---

## 2) READINESS MATRIX

### A) Product & Screens

| Feature/Area | Status | Evidence | Gaps/Risks | Bucket | Next Steps |
|--------------|--------|----------|------------|--------|------------|
| Email/Password Auth | ✅ Ready | `src/hooks/useAuth.tsx:472-675` | None | A | - |
| Google OAuth | ⚠️ Partial | `src/hooks/useAuth.tsx:553-585` | UI buttons not rendered in AuthModal | B | Add OAuth buttons to AuthModal.tsx |
| Apple OAuth | ⚠️ Partial | `src/hooks/useAuth.tsx:587-619` | UI buttons not rendered in AuthModal | B | Add OAuth buttons to AuthModal.tsx |
| Password Reset | ✅ Ready | `src/hooks/useAuth.tsx:701-721` | None | A | - |
| Email Verification | ✅ Ready | Supabase default flow | No custom UI | A | - |
| First-time Onboarding | ✅ Ready | `src/hooks/useOnboarding.ts` | None | A | - |
| Trip Creation | ✅ Ready | `src/components/CreateTripModal.tsx` | None | A | - |
| Trip Join via Invite | ✅ Ready | `src/services/tripInviteService.ts`, `supabase/functions/join-trip` | None | A | - |
| Collaborator Management | ✅ Ready | `src/services/tripService.ts`, `trip_members` table | None | A | - |
| Real-time Chat | ✅ Ready | `src/services/chatService.ts`, Supabase Realtime | None | A | - |
| Message Threading | ✅ Ready | `src/components/chat/ThreadView.tsx` | None | A | - |
| Message Reactions | ✅ Ready | `message_reactions` table, migration `20260107000000` | None | A | - |
| Message Deletion/Editing | ✅ Ready | `src/services/chatService.ts:editChatMessage/deleteChatMessage` | Soft delete only | A | - |
| Typing Indicators | ✅ Ready | `src/services/typingIndicatorService.ts` | None | A | - |
| Read Receipts | ✅ Ready | `src/services/readReceiptsService.ts` | None | A | - |
| Offline Message Queue | ✅ Ready | `src/services/offlineMessageQueue.ts` (IndexedDB) | None | A | - |
| Calendar Events CRUD | ✅ Ready | `src/services/calendarService.ts` | None | A | - |
| Timezone Handling | ⚠️ Partial | Default to user TZ | No multi-TZ support | A | Document limitation |
| ICS Export | ✅ Ready | `src/utils/calendarExport.ts` | None | A | - |
| ICS Import | ❌ Missing | N/A | Not implemented | B | Implement ICS parser (S) |
| Event RSVP | ✅ Ready | `src/hooks/useEventRSVP.ts` | None | A | - |
| Places/Saved Links | ✅ Ready | `src/services/tripLinksService.ts` | None | A | - |
| Maps Integration | ✅ Ready | `src/services/googleMapsService.ts`, `src/services/googlePlacesNew.ts` | None | A | - |
| Tasks | ✅ Ready | `src/services/taskService.ts`, `src/types/tasks.ts` | None | A | - |
| Polls | ✅ Ready | `src/services/pollService.ts` | None | A | - |
| Payment Tracking | ✅ Ready | `src/services/paymentService.ts`, `src/hooks/usePayments.ts` | None | A | - |
| Media Uploads | ✅ Ready | `src/services/uploadService.ts`, `trip-media` bucket | None | A | - |
| Photo Compression | ✅ Ready | `browser-image-compression`, max 1MB/1920px | None | A | - |
| Upload Progress | ✅ Ready | `src/hooks/useMediaUpload.ts` | None | A | - |
| PDF Export | ✅ Ready | `src/utils/exportPdfClient.ts`, jsPDF | None | A | - |
| Pro/Paid Feature Gating | ✅ Ready | `src/utils/featureGating.ts`, `src/billing/entitlements.ts` | None | A | - |
| Account Deletion | ⚠️ Partial | UI in `ConsumerGeneralSettings.tsx` | RPC `request_account_deletion` not implemented | B | Implement Supabase RPC |
| Data Export | ❌ Missing | Mentioned in Privacy Policy | Not implemented | B | Implement GDPR export (M) |
| Error States | ✅ Ready | Error boundaries, toast notifications | None | A | - |
| Empty States | ✅ Ready | Throughout components | None | A | - |
| Loading States | ✅ Ready | Skeleton loaders, spinners | None | A | - |
| Network Failure UX | ✅ Ready | `src/hooks/useOfflineStatus.ts` | None | A | - |

### B) Monetization & Revenue

| Feature/Area | Status | Evidence | Gaps/Risks | Bucket | Next Steps |
|--------------|--------|----------|------------|--------|------------|
| Stripe Web Checkout | ✅ Ready | `supabase/functions/create-checkout`, `src/billing/providers/stripe.ts` | None | A | - |
| Stripe Customer Portal | ✅ Ready | `supabase/functions/customer-portal` | None | A | - |
| Stripe Webhooks | ✅ Ready | `supabase/functions/stripe-webhook` | None | A | - |
| RevenueCat SDK Setup | ✅ Ready | `@revenuecat/purchases-capacitor:12.0.0`, iOS Swift code | Using TEST key | C | Replace with production key |
| RevenueCat Offerings | ⚠️ Partial | Swift code defines products | Not created in App Store Connect | C | Create products in ASC |
| RevenueCat Entitlements | ✅ Ready | `ios/App/App/RevenueCat/EntitlementChecker.swift` | None | A | - |
| Restore Purchases | ✅ Ready | `ios/App/App/RevenueCat/SubscriptionManager.swift` | None | A | - |
| Paywall UI | ✅ Ready | `ios/App/App/RevenueCat/PaywallView.swift`, `src/components/native/NativeSubscriptionPaywall.tsx` | None | A | - |
| Subscription Management UI | ✅ Ready | `src/components/settings/SubscriptionSettings.tsx` | None | A | - |
| Server-side Entitlements | ✅ Ready | `supabase/functions/check-subscription`, `profiles.subscription_*` | None | A | - |
| App Store Compliance | ⚠️ Partial | IAP for consumer, Stripe for B2B | `APPLE_IAP_ENABLED=false` | C | Set flag true after ASC setup |

### C) Capacitor + Native iOS Readiness

| Feature/Area | Status | Evidence | Gaps/Risks | Bucket | Next Steps |
|--------------|--------|----------|------------|--------|------------|
| Capacitor Config | ✅ Ready | `capacitor.config.ts` | None | A | - |
| Bundle ID | ✅ Ready | `com.chravel.app` | None | A | - |
| App Name | ✅ Ready | `Chravel` | None | A | - |
| iOS Deployment Target | ✅ Ready | iOS 15.0 | None | A | - |
| Info.plist Permissions | ✅ Ready | Camera, Photos, Location | All required strings present | A | - |
| URL Schemes | ✅ Ready | `chravel://` | None | A | - |
| Universal Links | ⚠️ Partial | `applinks:chravel.app` in entitlements | `APPLE_TEAM_ID` not set | C | Set Team ID in env |
| AASA Configuration | ✅ Ready | `api/aasa.ts`, `vercel.json` rewrite | Needs Team ID placeholder | C | Update with actual Team ID |
| Push Notifications | ⚠️ Partial | `@capacitor/push-notifications` installed | APNs cert not configured, entitlement=development | C | Configure APNs, change to production |
| Haptics | ✅ Ready | `@capacitor/haptics`, `src/native/haptics.ts` | None | A | - |
| Deep Links Handling | ✅ Ready | `src/hooks/useDeepLinks.ts` | None | A | - |
| App Icons | ✅ Ready | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024x1024.png` | None | A | - |
| Launch Screen | ✅ Ready | `LaunchScreen.storyboard`, `Splash.imageset` | None | A | - |
| Splash Screen Plugin | ✅ Ready | `@capacitor/splash-screen` | None | A | - |
| Status Bar | ✅ Ready | `@capacitor/status-bar`, overlaysWebView=true | None | A | - |
| Keyboard Handling | ✅ Ready | `@capacitor/keyboard`, resize=body | None | A | - |
| Build Config | ✅ Ready | Marketing Version 1.0, Build 1 | None | A | - |
| Crash Handling | ✅ Ready | Sentry integration | None | A | - |

### D) Security, Privacy, Compliance

| Feature/Area | Status | Evidence | Gaps/Risks | Bucket | Next Steps |
|--------------|--------|----------|------------|--------|------------|
| Secrets Management | ⚠️ Partial | `.env` files gitignored, server secrets in Edge Functions | Hardcoded Supabase anon key | B | Remove default fallback |
| Auth Token Storage | ✅ Ready | Supabase localStorage with safe fallback | None | A | - |
| PII Encryption | ✅ Ready | `src/services/privacyService.ts`, AES-256-GCM | None | A | - |
| Profile Privacy Flags | ✅ Ready | `show_email`, `show_phone` enforced via RLS | None | A | - |
| Account Deletion | ⚠️ Partial | UI exists, 30-day policy documented | No cascade delete RPC | B | Implement RPC |
| Privacy Policy Link | ✅ Ready | `https://chravel.app/privacy`, `src/pages/PrivacyPolicy.tsx` | Address placeholder | C | Add company address |
| Terms of Service Link | ✅ Ready | `https://chravel.app/terms`, `src/pages/TermsOfService.tsx` | Address placeholder | C | Add company address |
| App Tracking Transparency | ❌ Missing | N/A | No ATT implementation | B | Implement ATT request (if tracking) |
| GDPR/CCPA | ⚠️ Partial | Privacy Policy mentions rights | No data export, no audit log | B | Implement data export |
| Row-Level Security | ✅ Ready | 590 RLS policies across 122 migrations | None | A | - |
| Input Sanitization | ✅ Ready | `src/utils/securityUtils.ts` | None | A | - |
| Security Headers | ✅ Ready | `supabase/functions/_shared/security.ts` | None | A | - |
| Rate Limiting | ✅ Ready | Database-backed rate limiting in Edge Functions | None | A | - |

### E) Reliability, Performance, QA

| Feature/Area | Status | Evidence | Gaps/Risks | Bucket | Next Steps |
|--------------|--------|----------|------------|--------|------------|
| App Startup Optimization | ✅ Ready | Lazy loading with retry, `src/utils/performanceOptimization.ts` | None | A | - |
| Core Web Vitals | ✅ Ready | `src/telemetry/performance.ts` | None | A | - |
| Offline Mode | ✅ Ready | IndexedDB cache, `src/offline/` | None | A | - |
| Unit Tests | ✅ Ready | 40 test files, Vitest | Thresholds disabled | A | Enable thresholds |
| E2E Tests | ✅ Ready | 10 Playwright specs | Some categories incomplete | A | Add missing specs |
| CI/CD | ✅ Ready | `.github/workflows/ci.yml` | None | A | - |
| Coverage Reporting | ✅ Ready | V8 + Codecov | Thresholds commented out | B | Enforce 50% minimum |
| Analytics | ✅ Ready | PostHog integration | None | A | - |
| Error Tracking | ✅ Ready | Sentry integration | None | A | - |
| Feature Flags | ✅ Ready | `src/hooks/useFeatureFlags.ts` | Local only, no remote | A | Consider remote flags |

### F) Store Submission Readiness

| Feature/Area | Status | Evidence | Gaps/Risks | Bucket | Next Steps |
|--------------|--------|----------|------------|--------|------------|
| App Name/Subtitle | ✅ Ready | `appstore/metadata/` | None | A | - |
| Description | ✅ Ready | 4000-char compliant | None | A | - |
| Keywords | ✅ Ready | `appstore/metadata/` | None | A | - |
| Screenshots (iPhone) | ✅ Ready | 8 screenshots, 1290×2796 | None | A | - |
| Screenshots (iPad) | ✅ Ready | 4 screenshots, 2048×2732 | None | A | - |
| Export Compliance | ✅ Ready | `ITSAppUsesNonExemptEncryption=false` | None | A | - |
| IAP Products | ❌ Missing | Swift code defines, not in ASC | Products not created | C | Create in App Store Connect |
| Review Notes | ✅ Ready | Demo account, step-by-step guide | None | A | - |
| What's New | ✅ Ready | `appstore/metadata/` | None | A | - |
| CFBundleShortVersionString | ✅ Ready | 1.0 | None | A | - |
| CFBundleVersion | ✅ Ready | 1 | None | A | - |
| Review Risks | ⚠️ Medium | Account deletion incomplete | Guideline 5.1.1 risk | B | Implement delete RPC |

---

## 3) BUCKET A: Implemented & Ready

All items marked ✅ Ready in the matrix above. Key highlights:

### Core Features (Production-Ready)
- **Authentication**: Email/password, session management, password reset
- **Trip Management**: Full CRUD, invitations, member management, join approval workflow
- **Messaging**: Real-time chat, threading, reactions, read receipts, typing indicators, offline queue
- **Calendar**: Events CRUD, conflict detection, ICS export, RSVP
- **Payments**: Expense tracking, splitting, Stripe web checkout with webhooks
- **Media**: Photo/video uploads with compression, gallery, progress tracking
- **Pro Features**: Comprehensive Pro trip types, feature gating, subscription tiers

### Native iOS (Production-Ready)
- Capacitor 8.0 with all required plugins
- Status bar, keyboard, haptics properly configured
- Deep link handling (custom scheme + universal links structure)
- Splash screen and app icons configured
- RevenueCat Swift implementation complete

### Infrastructure (Production-Ready)
- 590 RLS policies for security
- PostHog analytics + Sentry error tracking
- CI/CD with lint, typecheck, unit tests, e2e tests
- Offline caching with IndexedDB
- Service worker for PWA support

### Polish Suggestions
1. Add password strength indicator to signup form
2. Consider session timeout setting in security settings
3. Add "logout from all devices" feature
4. Implement notification preferences per channel

---

## 4) BUCKET B: Not Implemented but AI-Implementable

### 4.1 OAuth UI Buttons

**Current State**: Functions `signInWithGoogle()` and `signInWithApple()` exist but buttons not rendered.

**Plan of Attack**:
1. Add OAuth button components to `src/components/AuthModal.tsx`
2. Style with existing design system (Apple black, Google white buttons)
3. Add "Or continue with" divider

**Files to Modify**:
- `src/components/AuthModal.tsx` (add buttons around line 359)

**Implementation**:
```tsx
// Add after the "Don't have an account?" section
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
  </div>
</div>
<div className="grid grid-cols-2 gap-3">
  <Button variant="outline" onClick={() => signInWithApple()}>
    <Apple className="mr-2 h-4 w-4" />
    Apple
  </Button>
  <Button variant="outline" onClick={() => signInWithGoogle()}>
    <Mail className="mr-2 h-4 w-4" />
    Google
  </Button>
</div>
```

**Edge Cases**: Handle OAuth errors, add loading states
**Tests**: Add E2E test for OAuth flow (mocked)
**Effort**: **S** [1-2 hours]

---

### 4.2 Account Deletion RPC

**Current State**: UI calls `supabase.rpc('request_account_deletion')` but RPC doesn't exist.

**Plan of Attack**:
1. Create Supabase migration with RPC function
2. Implement cascade deletion logic
3. Add 30-day grace period option

**Files to Create**:
- `supabase/migrations/20260109000000_account_deletion.sql`

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark profile for deletion (30-day grace period)
  UPDATE profiles
  SET
    deletion_requested_at = now(),
    deletion_scheduled_for = now() + interval '30 days'
  WHERE user_id = v_user_id;

  -- Or immediate deletion (uncomment if preferred):
  -- DELETE FROM trip_members WHERE user_id = v_user_id;
  -- DELETE FROM profiles WHERE user_id = v_user_id;
  -- This will cascade through foreign keys
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION request_account_deletion() TO authenticated;
```

**Edge Cases**: User with active subscriptions, trip owner deletion, data export before delete
**Tests**: Add integration test for deletion flow
**Effort**: **M** [3-4 hours]

---

### 4.3 Data Export (GDPR)

**Current State**: Mentioned in Privacy Policy but not implemented.

**Plan of Attack**:
1. Create Edge Function to gather all user data
2. Package as JSON/ZIP download
3. Add UI button in settings

**Files to Create**:
- `supabase/functions/export-user-data/index.ts`
- Modify: `src/components/consumer/ConsumerGeneralSettings.tsx`

**Implementation Approach**:
```typescript
// Edge function pseudocode
const userData = {
  profile: await getProfile(userId),
  trips: await getUserTrips(userId),
  messages: await getUserMessages(userId),
  media: await getUserMedia(userId),
  payments: await getUserPayments(userId),
  preferences: await getUserPreferences(userId),
};
return new Response(JSON.stringify(userData, null, 2), {
  headers: { 'Content-Type': 'application/json' }
});
```

**Edge Cases**: Large data sets, rate limiting, media files (URLs vs actual files)
**Tests**: Test with user having various data types
**Effort**: **M** [4-6 hours]

---

### 4.4 App Tracking Transparency

**Current State**: Not implemented (no IDFA usage detected).

**Plan of Attack**:
1. Determine if tracking is actually needed (PostHog doesn't require ATT)
2. If needed, add native ATT request on first launch

**Files to Modify** (if needed):
- `ios/App/App/AppDelegate.swift`
- `ios/App/App/Info.plist`

**Implementation**:
```swift
// In AppDelegate.swift
import AppTrackingTransparency

func applicationDidBecomeActive(_ application: UIApplication) {
    if #available(iOS 14, *) {
        ATTrackingManager.requestTrackingAuthorization { status in
            // Handle status
        }
    }
}
```

```xml
<!-- In Info.plist -->
<key>NSUserTrackingUsageDescription</key>
<string>This helps us improve the app experience and show relevant content.</string>
```

**Edge Cases**: User denies, status check before using IDFA
**Tests**: Manual testing on iOS 14+ device
**Effort**: **S** [1-2 hours, if needed]

---

### 4.5 Hardcoded Anon Key Removal

**Current State**: Fallback Supabase anon key hardcoded in client.ts.

**Plan of Attack**:
1. Remove default fallback value
2. Add clear error if env var missing
3. Update documentation

**Files to Modify**:
- `src/integrations/supabase/client.ts`

**Implementation**:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase configuration missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}
```

**Edge Cases**: Local development without .env
**Tests**: Verify build fails gracefully with missing env
**Effort**: **S** [30 minutes]

---

### 4.6 ICS Import

**Current State**: Export works, import not implemented.

**Plan of Attack**:
1. Add file upload UI for .ics files
2. Parse ICS format using simple regex/parser
3. Create calendar events from parsed data

**Files to Create**:
- `src/utils/calendarImport.ts`
- Modify: `src/components/CalendarEventModal.tsx`

**Effort**: **M** [4-6 hours]

---

### 4.7 Test Coverage Enforcement

**Current State**: Thresholds commented out in vitest.config.ts.

**Plan of Attack**:
1. Run coverage report to assess current state
2. Gradually enable thresholds (start at 30%, increase to 50%)
3. Add coverage badge to README

**Files to Modify**:
- `vitest.config.ts`

**Effort**: **S** [1 hour]

---

## 5) BUCKET C: Human-Only Requirements

### 5.1 Apple Developer Account Setup

**Where**: [Apple Developer Portal](https://developer.apple.com)

**Checklist**:
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Accept latest agreements
- [ ] Verify company/individual identity
- [ ] Note down **Team ID** (10-character alphanumeric)

**Inputs Needed**: Legal name, DUNS number (for organizations), payment method

**Common Failure Points**:
- DUNS number mismatch with company name
- Waiting period for enrollment approval (up to 48 hours)
- Expired agreements blocking submission

---

### 5.2 App Store Connect Configuration

**Where**: [App Store Connect](https://appstoreconnect.apple.com)

**Checklist**:
- [ ] Create new app with Bundle ID `com.chravel.app`
- [ ] Fill in all metadata from `/appstore/metadata/`
- [ ] Upload all screenshots from `/appstore/screenshots/`
- [ ] Set app category: Travel
- [ ] Set content rating (complete questionnaire)
- [ ] Add Privacy Policy URL: `https://chravel.app/privacy`
- [ ] Add Support URL
- [ ] Configure pricing (free with IAP)

**Inputs Needed**: All metadata ready in repo, need actual upload

---

### 5.3 In-App Purchase Product Creation

**Where**: App Store Connect → My Apps → Chravel → Features → In-App Purchases

**Products to Create**:

| Product ID | Type | Price | Duration |
|------------|------|-------|----------|
| `com.chravel.explorer.monthly` | Auto-Renewable | $9.99 | 1 Month |
| `com.chravel.explorer.annual` | Auto-Renewable | $99.00 | 1 Year |
| `com.chravel.frequentchraveler.monthly` | Auto-Renewable | $19.99 | 1 Month |
| `com.chravel.frequentchraveler.annual` | Auto-Renewable | $199.00 | 1 Year |

**Additional Steps**:
- [ ] Create Subscription Group: "Chravel Subscriptions"
- [ ] Add localized display names and descriptions
- [ ] Submit for review (can be concurrent with app review)

**Common Failure Points**:
- Pricing tier not available in all regions
- Missing localized descriptions
- Subscription group misconfiguration

---

### 5.4 RevenueCat Dashboard Configuration

**Where**: [RevenueCat Dashboard](https://app.revenuecat.com)

**Checklist**:
- [ ] Create app for iOS
- [ ] Enter Bundle ID: `com.chravel.app`
- [ ] Create API key (note: replace test key)
- [ ] Create Entitlements:
  - `chravel_explorer`
  - `chravel_frequent_chraveler`
- [ ] Create Offerings:
  - `default` offering with all 4 products
- [ ] Add Products (match App Store Connect IDs)
- [ ] Configure App Store Server Notifications:
  - URL: Get from RevenueCat
  - Add to App Store Connect → App Information → App Store Server Notifications

**Inputs Needed**: App Store Connect Shared Secret, Bundle ID

---

### 5.5 APNs Certificate Setup

**Where**: Apple Developer Portal → Certificates

**Checklist**:
- [ ] Create APNs Key (recommended over certificate)
  - Go to Keys → Create new key
  - Enable Apple Push Notifications service (APNs)
  - Download `.p8` file (save securely, only downloadable once)
  - Note Key ID and Team ID
- [ ] Upload to Supabase:
  - Supabase Dashboard → Project Settings → Push Notifications
  - Or use third-party service (OneSignal, Firebase)

**Common Failure Points**:
- Using development certificate in production
- Key not enabled for push
- Team ID mismatch

---

### 5.6 Universal Links DNS/Hosting

**Where**: DNS Provider + Vercel

**Checklist**:
- [ ] Ensure `chravel.app` domain is properly configured
- [ ] Verify `/.well-known/apple-app-site-association` is accessible
- [ ] Update AASA with actual Team ID:
  ```json
  "appIDs": ["TEAM_ID.com.chravel.app"]
  ```
- [ ] Test with Apple's AASA validator

**Common Failure Points**:
- AASA not served with correct Content-Type
- Caching issues (Apple caches aggressively)
- Team ID placeholder not replaced

---

### 5.7 Environment Variables (Production)

**Where**: Vercel Dashboard + Local `.env`

**Required Variables**:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat
VITE_REVENUECAT_IOS_API_KEY=appl_... (PRODUCTION key)

# Apple
APPLE_TEAM_ID=XXXXXXXXXX

# Analytics
VITE_POSTHOG_API_KEY=phc_...
VITE_SENTRY_DSN=https://...@sentry.io/...

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

---

### 5.8 Xcode Project Configuration

**Where**: Xcode

**Checklist**:
- [ ] Open `ios/App/App.xcodeproj` in Xcode
- [ ] Select Team in Signing & Capabilities
- [ ] Verify Bundle ID: `com.chravel.app`
- [ ] Change `aps-environment` from `development` to `production` in App.entitlements
- [ ] Update `Purchases.logLevel` from `.debug` to `.warn` in AppDelegate.swift
- [ ] Replace RevenueCat test API key with production key
- [ ] Archive and upload to App Store Connect

**Common Failure Points**:
- Signing certificate expired
- Provisioning profile mismatch
- Forgetting to change entitlements to production

---

### 5.9 Banking & Tax Information

**Where**: App Store Connect → Agreements, Tax, and Banking

**Checklist**:
- [ ] Accept Paid Applications agreement
- [ ] Add bank account for payments
- [ ] Complete tax forms (W-9 for US, W-8BEN for international)
- [ ] Set up tax categories for each country

**Common Failure Points**:
- Bank account verification takes 1-3 days
- Tax form errors require resubmission
- Must complete before first paid app can go live

---

## 6) "FIRST 48 HOURS" LAUNCH SPRINT PLAN

### Day 1 (Hours 1-8): Foundation Setup

| Hour | Task | Owner | DoD |
|------|------|-------|-----|
| 1-2 | Apple Developer Account verification | Human | Team ID obtained, agreements signed |
| 2-3 | Create app in App Store Connect | Human | App record created, Bundle ID registered |
| 3-4 | Create all 4 IAP products | Human | Products in "Ready to Submit" status |
| 4-5 | Configure RevenueCat dashboard | Human | Entitlements + Offerings created, products linked |
| 5-6 | Generate APNs key | Human | `.p8` file downloaded, Key ID noted |
| 6-7 | Update environment variables | Human | All production keys in Vercel + local |
| 7-8 | Update AASA with Team ID | AI/Human | Universal links test passing |

### Day 2 (Hours 9-16): Code Updates & Build

| Hour | Task | Owner | DoD |
|------|------|-------|-----|
| 9-10 | Replace RevenueCat test key | AI | Production key in AppDelegate.swift |
| 10-11 | Change push entitlement to production | AI | `aps-environment` = `production` |
| 11-12 | Add OAuth buttons to AuthModal | AI | Google/Apple buttons visible and functional |
| 12-13 | Implement account deletion RPC | AI | RPC deployed, UI calling it successfully |
| 13-14 | Remove hardcoded Supabase key | AI | Build fails gracefully without env vars |
| 14-15 | Run full test suite | AI | All tests passing |
| 15-16 | Build iOS archive | Human | `.ipa` generated without errors |

### Day 2 Evening / Day 3 (Hours 17-24): Testing & Submit

| Hour | Task | Owner | DoD |
|------|------|-------|-----|
| 17-18 | Test sandbox purchases | Human | All 4 products purchasable |
| 18-19 | Test universal links | Human | Links open correct screens in app |
| 19-20 | Test push notifications | Human | Push received on device |
| 20-21 | Upload build to App Store Connect | Human | Build visible in TestFlight |
| 21-22 | Internal TestFlight testing | Human | Smoke test passed |
| 22-23 | Complete App Store submission form | Human | All fields filled |
| 23-24 | Submit for review | Human | Status: "Waiting for Review" |

---

## 7) OUTPUT APPENDIX

### 7.1 Repo Map Summary

```
/home/user/Chravel/
├── src/                          # React/TypeScript source code
│   ├── components/               # 42+ component directories
│   ├── pages/                    # 31 page components
│   ├── hooks/                    # 100+ custom React hooks
│   ├── services/                 # 80+ service modules
│   ├── integrations/             # Supabase + RevenueCat clients
│   ├── billing/                  # Subscription/entitlement logic
│   ├── native/                   # Native bridge (haptics, push, etc.)
│   ├── platform/                 # Platform abstraction layer
│   ├── offline/                  # IndexedDB caching
│   ├── telemetry/                # Analytics + error tracking
│   ├── types/                    # 31 type definition files
│   └── utils/                    # 40+ utility modules
├── ios/                          # iOS Capacitor project
│   └── App/App/
│       ├── AppDelegate.swift     # iOS entry point
│       ├── Info.plist            # Permissions + config
│       ├── App.entitlements      # Capabilities
│       ├── Assets.xcassets/      # Icons + splash
│       └── RevenueCat/           # 6 Swift files for IAP
├── supabase/
│   ├── functions/                # 20+ Edge Functions
│   └── migrations/               # 122+ migration files
├── appstore/                     # App Store assets
│   ├── metadata/                 # App description, keywords
│   ├── screenshots/              # iPhone + iPad screenshots
│   └── legal/                    # Privacy Policy, ToS
├── e2e/                          # Playwright E2E tests
├── public/                       # PWA assets, service worker
└── [config files]                # package.json, capacitor.config.ts, etc.
```

### 7.2 Environment Variables Discovered

```env
# Core (Required)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# Mobile (Required for iOS)
IOS_BUNDLE_ID
IOS_APP_NAME
APPLE_TEAM_ID                     # ⚠️ NOT SET

# Payments
VITE_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VITE_REVENUECAT_IOS_API_KEY       # ⚠️ Using test key
VITE_REVENUECAT_ANDROID_API_KEY

# Maps & Location
VITE_GOOGLE_MAPS_API_KEY

# Analytics
VITE_POSTHOG_API_KEY
VITE_POSTHOG_HOST
VITE_SENTRY_DSN
VITE_GA_MEASUREMENT_ID

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL

# AI
LOVABLE_API_KEY
GOOGLE_AI_API_KEY

# Feature Flags
VITE_ENABLE_DEMO_MODE
VITE_ENABLE_AI_CONCIERGE
VITE_ENABLE_STRIPE_PAYMENTS
VITE_ENABLE_PUSH_NOTIFICATIONS

# Deployment
VITE_APP_URL
VITE_ENVIRONMENT
```

### 7.3 Build Commands

```bash
# Prerequisites
node -v  # Requires Node 18+
npm -v   # Requires npm 8+

# Web Development
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:5173)
npm run build            # Production build (includes typecheck)
npm run preview          # Preview production build

# Quality Checks
npm run lint             # ESLint + fix
npm run lint:check       # ESLint (CI mode)
npm run typecheck        # TypeScript check
npm run validate         # Lint + typecheck + format check

# Testing
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:coverage    # Vitest with coverage
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright with UI

# iOS Build
npm run cap:sync         # Build + sync to iOS
npm run ios:open         # Open Xcode
npm run ios:run          # Build + run on device/simulator

# In Xcode
# Product → Archive → Distribute App → App Store Connect
```

### 7.4 Open Questions / Unknowns

1. **Android Status**: No `android/` folder generated. Is Android launch planned? If so, needs complete setup.

2. **Stream Chat**: Environment variables reference Stream API but actual integration unclear. Is chat using Stream or Supabase Realtime?

3. **Stripe vs RevenueCat Source of Truth**: Both systems can track subscriptions. Which is authoritative for user entitlements? (Currently appears Stripe-first with RevenueCat for IAP)

4. **Company Address**: Privacy Policy and Terms both have "[Address to be added]" placeholder. Legal entity address needed.

5. **APNs Backend**: Push notification Edge Function `send-push` referenced but implementation unclear. Is it using Supabase's push feature, Firebase, or custom APNs?

6. **Demo Account Data**: Review notes mention `demo@chravel.app` - is this account populated with representative data for App Review?

---

## Summary

Chravel is a **well-architected, feature-rich** travel collaboration app that is **78% ready** for App Store launch. The core product functionality is solid, with professional-grade implementations of chat, payments, media, and offline support.

**Critical Path**: The 5-6 day sprint focuses on configuration and compliance items rather than feature development. Most blockers are in **Bucket C (Human-Only)** requiring Apple Developer Portal and App Store Connect access.

**Recommendation**: Proceed with the launch sprint plan. The app's architecture and code quality are production-ready. Success depends on correctly configuring the external services (RevenueCat, APNs, Universal Links) and completing the human-required Apple setup tasks.
