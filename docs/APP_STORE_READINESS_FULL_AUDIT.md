# Chravel App Store Submission Readiness — Full Audit Report

**Date:** February 16, 2026  
**Project:** Chravel (Capacitor/React → iOS)  
**Bundle ID:** com.chravel.app  
**Branch:** cursor/app-store-approval-readiness-dbe3

---

## Executive Summary

This audit evaluates Chravel against a comprehensive App Store approval checklist derived from Apple's Human Interface Guidelines, App Review Guidelines, and common rejection reasons. The app is a **Capacitor-wrapped React PWA** targeting iOS, with user accounts, subscriptions (RevenueCat), and an AI Concierge (Gemini LLM).

**Overall Readiness Score: 7.5/10**

---

## Implementation Status (Post-Fix — Feb 16, 2026)

The following fixes from this audit have been implemented:

- ✅ **"Coming Soon" removed** — All user-facing "Coming Soon" / "beta" strings replaced or removed across TeamOrgChart, ChannelMembersModal, ProTabContent, EventSetupWizard, UpgradeModal, AdvertiserSettings, LinkCard, ProfilePage, NativeTripTypeSwitcher, TripTasksTab, ConsumerBillingSection, ComingSoonBadge, featureGating.
- ✅ **Gemini safety settings** — `safetySettings` with `BLOCK_MEDIUM_AND_ABOVE` for all harm categories added to `lovable-concierge/index.ts` and `_shared/gemini.ts`.
- ✅ **Support page** — `/support` route and `SupportPage.tsx` created; FooterSection contact emails updated to support@chravel.app.
- ✅ **Screenshots** — Playwright script `scripts/capture-appstore-screenshots.ts` captures iPhone 6.7" and iPad 12.9" screenshots. Run `npm run screenshots:appstore` (with preview server on port 8080).

**Manual steps remaining:** Complete age rating questionnaire in App Store Connect.

---

# Section 1: How to Get Approved

## 1.1 Account Deletion

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | `src/components/consumer/ConsumerGeneralSettings.tsx` (lines 41–86), `supabase/migrations/20260110000000_account_deletion_rpc.sql` | |
| **Behavior** | Users can delete accounts via Settings → General Settings → Account Management → Delete Account. Confirmation requires typing "DELETE". RPC `request_account_deletion` marks account for deletion with 30-day grace period per App Store Guideline 5.1.1. | |
| **Impact** | Required for apps with accounts. Fully compliant. | |

---

## 1.2 No "Beta" or "Coming Soon" in the App

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Partially Implemented** | |
| **Location** | Multiple files (see below) | |
| **Issues** | Several user-facing "Coming Soon" strings and placeholders: | |

**Files with "Coming Soon" or similar:**

| File | Line(s) | Content |
|------|---------|---------|
| `src/components/pro/TeamOrgChart.tsx` | 37, 47, 138 | "Chart export feature coming soon!", "This feature is coming soon!", "Drag and drop to reorganize (coming soon)" |
| `src/components/pro/channels/ChannelMembersModal.tsx` | 166 | "Add Members (Coming Soon)" |
| `src/components/pro/ProTabContent.tsx` | 198, 218, 238, 258 | "Per-diem automation... coming soon", "Injury status tracking... coming soon", etc. |
| `src/components/events/EventInvitationsSection.tsx` | 25 | "Invitation management coming soon..." |
| `src/components/events/EventSetupWizard.tsx` | 145, 150, 160 | "Template selection coming soon...", "Schedule configuration coming soon...", "Invitation management coming soon..." |
| `src/components/UpgradeModal.tsx` | 43–44 | "Events tier coming soon!" toast |
| `src/components/advertiser/AdvertiserSettings.tsx` | 276 | title: "Coming Soon" |
| `src/components/LinkCard.tsx` | 116 | "Comments coming soon..." |
| `src/pages/ProfilePage.tsx` | 93, 115 | `alert('Feature coming soon!')` |
| `src/components/native/NativeTripTypeSwitcher.tsx` | 51, 279 | "Coming Soon" badge on Recommendations |
| `src/components/todo/TripTasksTab.tsx` | 167, 183 | "Feature coming soon!" in description |
| `src/components/consumer/ConsumerBillingSection.tsx` | 447, 449 | "Multi-language support (coming soon)", "Advanced integrations (coming soon)" |
| `src/types/pro.ts` | 446, 448 | Same strings in type definition |
| `src/components/ui/ComingSoonBadge.tsx` | 30, 33 | Reusable "Coming Soon" badge |
| `src/utils/featureGating.ts` | 5, 26, 84 | `comingSoonMessage` for feature gating |

**Recommendation:** Remove or replace all user-facing "Coming Soon" / "beta" text before submission. Options:
- Hide the feature entirely (don't show the button/section)
- Replace with "Contact us for early access" or similar
- Implement a minimal version so it's not "coming soon"

**Impact:** Apple frequently rejects apps with "coming soon" features (Guideline 4.2 – Minimum Functionality).

---

## 1.3 No Reference to Android Version

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | App Store metadata, app description, and user-facing copy | |
| **Behavior** | No mention of Android in `appstore/metadata/description.md` or user-facing UI. Android references exist only in internal code (e.g., `platform === 'android'`) for cross-platform logic. | |
| **Impact** | Compliant. | |

---

## 1.4 Don't Mention Competitor Apps in Description

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Partially Implemented** | |
| **Location** | `src/components/conversion/ReplacesGridData.ts`, `FullPageLanding` → `ReplacesSection` | |
| **Behavior** | **App Store description** (`appstore/metadata/description.md`) does NOT mention competitors. ✅ | |
| **Landing page** (`ReplacesSection` / `ReplacesGrid`) lists competitor apps by name: WhatsApp, Telegram, Slack, Microsoft Teams, Discord, iMessage/SMS, Google Calendar, Outlook, ChatGPT, Gemini, Perplexity, Claude, TripAdvisor, Venmo, Zelle, PayPal, Splitwise, Google Maps, etc. | |
| **Recommendation** | The landing page is at `chravel.app`. If reviewers visit it, they may see competitor names. Consider: (a) using generic categories ("Group chat apps", "Payment apps") instead of brand names, or (b) ensuring the landing page is clearly marketing and not part of the app experience. Apple's guideline targets the **app** and **App Store listing**; the website is less strict but best to avoid direct competitor names in prominent copy. | |
| **Impact** | Low–medium. Unlikely to cause rejection if not in the app or App Store description. | |

---

## 1.5 LLM Safeguards for Explicit Content

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Partially Implemented** | |
| **Location** | `supabase/functions/lovable-concierge/index.ts`, `supabase/functions/_shared/aiUtils.ts`, `supabase/functions/_shared/gemini.ts` | |
| **What's done** | - `filterProfanity()` in `aiUtils.ts` detects profanity in user input (lines 99–120) and logs violations; filtered text is used for logging, not blocking. |
| | - PII redaction (`redactPII`) for logs (emails, phones, credit cards, SSN, IPs). |
| | - Input validation (message length, format). |
| **What's missing** | - **No Gemini `safetySettings`** in the API request. The `geminiRequestBody` in `lovable-concierge/index.ts` (lines 1035–1043) does not include `safetySettings`. Gemini supports `HARM_CATEGORY_*` (e.g., `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_SEXUALLY_EXPLICIT`, `HARM_CATEGORY_DANGEROUS_CONTENT`) with `BLOCK_MEDIUM_AND_ABOVE` or `BLOCK_ONLY_HIGH`. |
| | - Profanity check logs but does not block the request. |
| **Recommendation** | Add Gemini safety settings to all Gemini API calls. Example: |
| | ```typescript |
| | // In geminiRequestBody or generationConfig |
| | safetySettings: [ |
| |   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, |
| |   { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, |
| |   { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, |
| |   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, |
| | ], |
| | ``` |
| | Also consider blocking requests when `filterProfanity()` detects violations, or returning a generic "Please rephrase" message. |
| **Impact** | Apps with generative AI are scrutinized. Missing safety settings can lead to Guideline 1.2 (Safety) or 4.2 rejections. | |

---

## 1.6 Test Account Credentials for Reviewers

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | `ios-release/fastlane/Deliverfile` (lines 85–106), `appstore/metadata/review_notes.md` | |
| **Behavior** | Demo account: `demo@chravel.app` / `DemoTrip2025!`. Provided in `app_review_information` and in detailed review notes with step-by-step testing path. | |
| **Impact** | Reduces review friction and speeds approval. | |

---

## 1.7 Screen Recordings for Complex Features

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Not Documented** | |
| **Location** | N/A | |
| **Behavior** | No screen recordings found in the repo. Review notes mention "We're happy to provide a video walkthrough or screen share if that would be helpful" but no pre-recorded video is attached. | |
| **Recommendation** | For complex flows (AI Concierge, expense splitting, calendar import), consider attaching a short screen recording (e.g., 30–60 seconds) to App Review Notes or hosting at a stable URL. | |
| **Impact** | Optional but can speed review and reduce back-and-forth. | |

---

## 1.8 No Hidden Functionality

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | Codebase review | |
| **Behavior** | No hidden debug menus, secret gestures, or unreachable features found. `CAPACITOR_DEBUG` is a build-time variable. No obfuscated or undocumented behavior. | |
| **Impact** | Compliant. | |

---

# Section 2: The Basics That Still Get People Rejected

## 2.1 Landing Page for Your Application

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | `src/components/landing/FullPageLanding.tsx`, `https://chravel.app` | |
| **Behavior** | Full landing page with Hero, Problem/Solution, AI Features, Use Cases, Replaces, FAQ, Pricing, Footer. Served at `chravel.app`. | |
| **Impact** | Compliant. | |

---

## 2.2 Privacy Policy URL

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | `https://chravel.app/privacy`, `src/pages/PrivacyPolicy.tsx`, `ios-release/fastlane/Deliverfile` line 76, `ios/App/App/RevenueCat/PaywallView.swift` line 213, `ios/App/App/RevenueCat/CustomerCenterView.swift` line 259 | |
| **Behavior** | Privacy policy route exists, content is comprehensive (data collection, retention, deletion, CCPA/GDPR, contact). URL configured in Deliverfile and native paywall. | |
| **Impact** | Required; compliant. | |

---

## 2.3 Clear Subscriptions/Pricing Upfront

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | `appstore/metadata/description.md` (lines 37–51), `ios/App/App/RevenueCat/PaywallView.swift`, `src/components/landing/sections/PricingLandingSection.tsx` | |
| **Behavior** | Description lists Chravel Plus ($9.99/month) and Chravel Pro ($29.99/month) with feature breakdown. Paywall shows tiers and pricing. | |
| **Impact** | Compliant. | |

---

## 2.4 Easy Contact Method

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Partially Implemented** | |
| **Location** | `ios-release/fastlane/Deliverfile` (support@chravel.app), `appstore/metadata/description.md` (Support: support@chravel.app), `src/components/landing/FooterSection.tsx` (support@chravelapp.com) | |
| **Behavior** | App Store and Deliverfile use `support@chravel.app`. Footer uses `support@chravelapp.com` and `hello@chravelapp.com` — **domain mismatch** (chravel.app vs chravelapp.com). | |
| **Recommendation** | Standardize on `support@chravel.app` (or your canonical domain) everywhere, including FooterSection. | |
| **Impact** | Inconsistent contact info can confuse users and reviewers. | |

---

## 2.5 Clear App Description

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | `appstore/metadata/description.md` | |
| **Behavior** | Description explains trip planning, collaboration, expense splitting, media hub, AI Concierge, offline access, use cases, and pricing. | |
| **Impact** | Compliant. | |

---

## 2.6 Proper Screenshots Showing Core Features

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Partially Implemented** | |
| **Location** | `appstore/screenshots/`, `appstore/ASSETS_CHECKLIST.md`, `appstore/screenshots/README.md` | |
| **Behavior** | Checklist and README list 8 iPhone 6.7" and 4 iPad 12.9" screenshots. `appstore/screenshots/` contains `.gitkeep` files; **no actual PNG files** in the repo. | |
| **Recommendation** | Generate or capture real screenshots and add them to `appstore/screenshots/iPhone-6.7/` and `appstore/screenshots/iPad-Pro-12.9/` before submission. | |
| **Impact** | Screenshots are required. Missing or placeholder screenshots can delay or block approval. | |

---

## 2.7 Proper Age Ratings

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Not Configured in Repo** | |
| **Location** | `ios-release/fastlane/Deliverfile` line 68: "# Age rating" with no value. Docs suggest 4+ or 17+ for UGC. | |
| **Behavior** | Age rating is configured in App Store Connect, not in code. Docs note it must be completed manually. | |
| **Recommendation** | Complete the age rating questionnaire in App Store Connect. For user-generated content (chat, photos), 17+ may be required; for travel/planning with moderation, 4+ may suffice. | |
| **Impact** | Required. Incorrect rating can cause rejection. | |

---

## 2.8 Don't Use Copyrighted Content

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | Codebase and assets | |
| **Behavior** | No obvious use of copyrighted music, images, or brand assets. Pro trip data uses fictional names (e.g., "Sundar", "Aparna" in googleIO2026) — ensure these are clearly fictional. | |
| **Impact** | Compliant. | |

---

## 2.9 Follow Apple's Design Guidelines (HIG)

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Fully Implemented** | |
| **Location** | UI components, navigation, native wrappers | |
| **Behavior** | App uses standard patterns (tabs, modals, lists), supports portrait and landscape, has proper safe areas. Capacitor/iOS integration follows expected patterns. | |
| **Impact** | Compliant. | |

---

# Section 3: Before You Hit Submit

## 3.1 Test on Multiple Screen Sizes

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ✅ **Documented / Expected** | |
| **Location** | Responsive layouts, `useIsMobile`, `useMobilePortrait` | |
| **Behavior** | App is responsive. Review notes state "The app is optimized for iPhone. It runs on iPad in compatibility mode." Screenshots planned for 6.7" and 12.9". | |
| **Recommendation** | Manually test on iPhone SE, iPhone 15 Pro Max, and iPad Pro before submission. | |
| **Impact** | Reduces layout/UX issues during review. | |

---

## 3.2 Test All Features Before Submitting

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Manual Step** | |
| **Location** | N/A | |
| **Behavior** | E2E tests exist (`e2e/specs/`). Manual testing checklist in `appstore/metadata/review_notes.md` and `ios-release/docs/RELEASE_CHECKLIST.md`. | |
| **Recommendation** | Execute full smoke test: auth, trip creation, chat, media, expenses, calendar, AI Concierge, subscriptions, account deletion. | |
| **Impact** | Critical to avoid "app doesn't work" rejections. | |

---

## 3.3 Make Sure Your App Actually Works

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Manual Step** | |
| **Location** | N/A | |
| **Behavior** | Build passes (`npm run build`). No obvious crash-on-launch patterns. | |
| **Recommendation** | Test on physical device; verify demo account works; ensure no crashes on cold start. | |
| **Impact** | Crashes on launch are a top rejection reason. | |

---

# Section 4: If You Get Rejected

## 4.1 Respond to Review Team Within 24 Hours

| Item | Status | Details |
|------|--------|---------|
| **Implementation** | ⚠️ **Process / Policy** | |
| **Location** | `appstore/metadata/review_notes.md`: "Response time: Within 4 hours during US business hours" | |
| **Behavior** | Commitment to fast response is documented. No technical implementation. | |
| **Recommendation** | Assign someone to monitor App Store Connect and respond within 24 hours to any rejection or question. | |
| **Impact** | Speeds resolution and resubmission. | |

---

# Additional: Most Rejections Are From

| Cause | Status | Notes |
|-------|--------|-------|
| Trying to be clever with the rules | ✅ | No obvious rule-bending. |
| App crashes on launch | ⚠️ | Manual testing required. |
| Missing privacy policy | ✅ | Policy exists and is linked. |
| "Coming soon" features | ⚠️ | Multiple instances; must be removed/replaced. |
| Lying anywhere in the app | ✅ | No false claims found. |

---

# Summary of Strengths

1. **Account deletion** — Implemented with RPC and 30-day grace period.
2. **Privacy policy** — Comprehensive, linked in app and metadata.
3. **Test account** — Demo credentials and detailed review notes.
4. **Subscriptions** — Clear pricing in description and paywall.
5. **Landing page** — Full marketing site at chravel.app.
6. **App description** — Clear and feature-focused.
7. **No Android references** in user-facing copy.
8. **No hidden functionality** detected.
9. **Contact info** — support@chravel.app in App Store metadata.
10. **Privacy manifest** — `PrivacyInfo.xcprivacy` with data types and API usage.

---

# Summary of Gaps

| Priority | Item | Fix |
|----------|------|-----|
| **P0** | "Coming soon" in app | Remove or replace all user-facing "Coming Soon" / "beta" text. |
| **P0** | Screenshots | Add real PNG screenshots to `appstore/screenshots/`. |
| **P1** | LLM safety settings | Add Gemini `safetySettings` to block harmful content. |
| **P1** | Support URL | Ensure `https://chravel.app/support` exists and works (or add route). |
| **P2** | Contact email consistency | Use support@chravel.app in FooterSection (not chravelapp.com). |
| **P2** | Age rating | Complete questionnaire in App Store Connect. |
| **P2** | Screen recordings | Optional: attach video for complex features. |

---

# Overall Readiness Score: 7.5/10

**Justification:**
- Strong base: account deletion, privacy policy, test account, clear pricing, landing page.
- Critical gaps: "Coming soon" strings (high rejection risk) and missing real screenshots.
- LLM safety and support URL are important for AI apps and support expectations.

---

# Complete Fix Package — Implementation Plan

## Fix 1: Remove "Coming Soon" from User-Facing UI

**Strategy:** Replace with either (a) hiding the feature, or (b) neutral copy.

| File | Change |
|------|--------|
| `TeamOrgChart.tsx` | Replace "coming soon" with "Chart export" (implement or hide button). |
| `ChannelMembersModal.tsx` | Replace "Add Members (Coming Soon)" with "Add Members" or hide. |
| `ProTabContent.tsx` | Replace "coming soon" lines with feature names only, or "Available in future update". |
| `EventInvitationsSection.tsx` | Replace with "Invitation management" or hide section. |
| `EventSetupWizard.tsx` | Same for template/schedule/invitation steps. |
| `UpgradeModal.tsx` | Remove or change "Events tier coming soon!" toast. |
| `AdvertiserSettings.tsx` | Replace "Coming Soon" title with feature name. |
| `LinkCard.tsx` | Replace "Comments coming soon" with "Comments" or hide. |
| `ProfilePage.tsx` | Replace `alert('Feature coming soon!')` with real behavior or remove. |
| `NativeTripTypeSwitcher.tsx` | Remove "Coming Soon" badge or gate feature. |
| `TripTasksTab.tsx` | Replace "Feature coming soon!" with actionable copy. |
| `ConsumerBillingSection.tsx` | Remove "Multi-language support (coming soon)" and "Advanced integrations (coming soon)" from displayed list, or rephrase. |
| `ComingSoonBadge.tsx` | Do not use in production build, or replace with "New" / "Beta" only where acceptable. |

---

## Fix 2: Add Gemini Safety Settings

**File:** `supabase/functions/lovable-concierge/index.ts`

In `geminiRequestBody` (around line 1035), add:

```typescript
const geminiRequestBody: any = {
  contents: geminiContents,
  systemInstruction: { parts: [{ text: systemInstruction }] },
  generationConfig: {
    temperature,
    maxOutputTokens: config.maxTokens || 2048,
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  ],
  tools: geminiTools,
};
```

Also add the same `safetySettings` to the `followUpBody` in `streamGeminiToSSE` (around line 447) and to any non-streaming Gemini request in `_shared/gemini.ts` if used.

---

## Fix 3: Support URL and Contact Consistency

**Option A:** Add `/support` route in `App.tsx`:

```tsx
<Route path="/support" element={<LazyRoute><SupportPage /></LazyRoute>} />
```

Create `src/pages/SupportPage.tsx` with contact info (support@chravel.app, FAQ link).

**Option B:** If support is only email, use `support_url("mailto:support@chravel.app")` in Deliverfile (some metadata fields accept mailto).

**FooterSection.tsx:** Change `support@chravelapp.com` and `hello@chravelapp.com` to `support@chravel.app` and `hello@chravel.app` (or your canonical domain).

---

## Fix 4: Screenshots

1. Run app in Xcode Simulator (iPhone 15 Pro Max, iPad Pro 12.9").
2. Navigate to each key screen (dashboard, chat, calendar, AI, expenses, maps, media, polls).
3. Capture (Cmd+S) and save as `01-home-dashboard.png`, etc.
4. Place in `appstore/screenshots/iPhone-6.7/` and `appstore/screenshots/iPad-Pro-12.9/`.
5. Or use `appstore/scripts/capture-screenshots.sh` if available.

---

## Fix 5: Age Rating (App Store Connect)

1. App Store Connect → Your App → App Information.
2. Complete the age rating questionnaire.
3. For travel app with chat/media: typically 4+ or 12+ depending on UGC and moderation.

---

## Verification Checklist Before Submit

- [ ] All "Coming Soon" removed or replaced
- [ ] Gemini safety settings added
- [ ] support@chravel.app used consistently
- [ ] https://chravel.app/support returns 200 (or mailto configured)
- [ ] Screenshots present in appstore/screenshots/
- [ ] Age rating completed in App Store Connect
- [ ] Demo account (demo@chravel.app / DemoTrip2025!) tested and working
- [ ] `npm run lint && npm run typecheck && npm run build` passes
- [ ] Test on physical iPhone and iPad

---

**Report generated by App Store Readiness Audit.**  
**Last updated:** February 16, 2026.
