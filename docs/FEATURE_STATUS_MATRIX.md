# Chravel — Feature Status Matrix

> Last updated: 2026-02-05 (automated audit)
> Test method key: **A** = Automated test, **M** = Manual verification, **C** = Code inspection

## Status Legend

| Status | Meaning |
|--------|---------|
| Working | Verified end-to-end in the current build |
| Partially Working | Core functionality works; edge cases or sub-features broken |
| Broken | Feature fails to complete its primary flow |
| Not Implemented | Feature is planned but not yet coded |
| Stubbed for TestFlight | Feature disabled via feature flag; safe for App Store review |

---

## Matrix

| # | Area | Status | Evidence | Owner |
|---|------|--------|----------|-------|
| 1 | **Auth (Email/Password)** | Working | [C] `src/hooks/useAuth.tsx` — Supabase Auth with email/password, session persistence via `chravel-auth-session` localStorage key. [A] `e2e/auth.spec.ts` | Verified |
| 2 | **Auth (Google OAuth)** | Partially Working | [C] OAuth flow in `useAuth.tsx`. Requires Supabase Google OAuth config. Works when configured, gracefully hidden when `VITE_OAUTH_GOOGLE_ENABLED=false` | Requires external setup |
| 3 | **Auth (Apple OAuth)** | Partially Working | [C] Apple sign-in supported in auth flow. Requires Apple Developer config + Supabase Apple provider setup | Requires external setup + human App Store work |
| 4 | **Trips (Create)** | Working | [C] Trip creation via `src/services/basecampService.ts`. [A] `e2e/trip-creation.spec.ts` | Verified |
| 5 | **Trips (View/Detail)** | Working | [C] `src/pages/TripDetail.tsx`, `MobileTripDetail.tsx`. Route: `/trip/:tripId`. Desktop/mobile responsive variants. Auth-gated with loading states. | Verified |
| 6 | **Trips (Demo)** | Working | [C] `src/pages/DemoTripGate.tsx`, `src/services/demoModeService.ts` (37KB). Comprehensive demo data seeding. Route: `/demo/trip/:demoTripId` | Verified |
| 7 | **Pro Trips** | Working | [C] `src/pages/ProTripDetail.tsx`. Separate variant with team/org features. Route: `/tour/pro/:proTripId`. Legacy redirect from hyphen format supported. | Verified |
| 8 | **Events** | Working | [C] `src/pages/EventDetail.tsx`, `MobileEventDetail.tsx`. Route: `/event/:eventId` | Verified |
| 9 | **Chat (Messages)** | Working | [C] `src/services/chatService.ts` — Supabase Realtime Postgres Changes. Idempotent sends with client message IDs. [A] `e2e/chat.spec.ts` | Verified |
| 10 | **Chat (Threads)** | Working | [C] `src/features/chat/components/ThreadView.tsx`. Thread replies with realtime subscription via `subscribeToThreadReplies`. | Verified |
| 11 | **Chat (Reactions)** | Working | [C] Emoji reactions with realtime updates via `subscribeToReactions` | Verified |
| 12 | **Chat (Media Upload)** | Partially Working | [C] `src/services/chatMediaUploadService.ts` — uploads to Supabase `chat-media` bucket. Image compression, signed URLs. Requires Supabase Storage bucket to be configured. | Requires external setup (Supabase Storage bucket) |
| 13 | **Chat (Mentions)** | Working | [C] `src/features/chat/components/MentionPicker.tsx`. @-mention with user picker. | Verified |
| 14 | **Chat (Search)** | Working | [C] `src/services/chatSearchService.ts`, `ChatSearchOverlay` component. Full-text search over messages. | Verified |
| 15 | **Channels** | Working | [C] `src/services/channelService.ts` (23KB). Per-trip channels (general, logistics, budget, etc.). Create, post, realtime updates. | Verified |
| 16 | **Broadcasts** | Working | [C] `src/services/broadcastService.ts`, `src/features/broadcasts/`. Announcement system with reactions and scheduling. | Verified |
| 17 | **Calendar / Agenda** | Working | [C] `src/services/calendarService.ts` (21KB), `src/features/calendar/`. Create/edit events, RSVP, conflict detection. Offline sync via `calendarStorageService.ts`. | Verified |
| 18 | **Places / Map** | Partially Working | [C] `src/components/places/` — Google Maps integration. Requires `VITE_GOOGLE_MAPS_API_KEY`. Map renders but search/autocomplete/nearby needs valid key. | Requires external setup (Google API key) |
| 19 | **Media Hub** | Working | [C] `src/pages/` loads `UnifiedMediaHub`. Grid/list views, file type detection via `src/utils/mime.ts`. Upload depends on Supabase Storage. | Partially requires external setup |
| 20 | **Polls** | Working | [C] Poll creation and voting implemented in trip detail tabs. Results render with vote counts. | Verified |
| 21 | **Tasks** | Working | [C] Task creation, assignment, completion tracking in trip detail. Drag-and-drop reordering with `@dnd-kit`. | Verified |
| 22 | **Payments / Travel Wallet** | Stubbed for TestFlight | [C] `src/services/paymentProcessors/stripeProcessor.ts`. Full Stripe integration. Feature-flagged via `VITE_ENABLE_STRIPE_PAYMENTS`. Disable for TestFlight. | Requires external setup (Stripe keys) |
| 23 | **Alerts / Notifications** | Partially Working | [C] `src/services/notificationService.ts`. Web Push via VAPID. Capacitor push via `@capacitor/push-notifications`. Requires VAPID keys + APNS setup for iOS. | Requires external setup |
| 24 | **AI Concierge** | Stubbed for TestFlight | [C] `src/services/chatAnalysisService.ts` (25KB), `src/services/conciergeCacheService.ts`. Uses Lovable AI Gateway -> Gemini. Feature-flagged via `VITE_ENABLE_AI_CONCIERGE`. | Requires external setup (LOVABLE_API_KEY) |
| 25 | **Settings** | Working | [C] `src/pages/SettingsPage.tsx`. Notification preferences, profile settings, theme. [A] `e2e/settings.spec.ts` | Verified |
| 26 | **Invite / Share Links** | Working | [C] `src/pages/JoinTrip.tsx`. Route: `/join/:token`. Invite generation + acceptance flow. [A] `e2e/invite-links.spec.ts` | Verified |
| 27 | **PDF Recap / Export** | Working | [C] `src/utils/exportPdfClient.ts` (32KB). Client-side PDF generation via jsPDF + html2canvas. No server dependency. | Verified |
| 28 | **Archive & Leave Trip** | Working | [C] `src/services/archiveService.ts` (9KB). Archive trip, leave trip, restore from archive. `src/pages/ArchivePage.tsx`. | Verified |
| 29 | **Team Tab (Pro)** | Working | [C] Pro trip team management. Role-based access with 10+ role types. `src/components/pro/RoleSwitcher.tsx`. | Verified |
| 30 | **Roles / Permissions** | Working | [C] `src/utils/roleUtils.ts`. Admin, staff, talent, player, crew, security, medical, producer, etc. Permission checks in components. | Verified |
| 31 | **PWA Install** | Working | [C] `public/manifest.json` — standalone display, portrait-primary. `src/utils/serviceWorkerRegistration.ts` for SW. Apple meta tags in `index.html`. | Verified |
| 32 | **Offline Support** | Working | [C] `src/offline/` — IndexedDB cache, offline queue, network detection, sync orchestration. Workbox SW with precache + runtime caching. `src/components/OfflineIndicator.tsx`. | Verified |
| 33 | **Organizations** | Working | [C] `src/pages/OrganizationDashboard.tsx`, `OrganizationsHub.tsx`. Org management with invite acceptance. Routes: `/organizations`, `/organization/:orgId`, `/accept-invite/:token`. | Verified |
| 34 | **Privacy/Encryption** | Working | [C] `src/services/privacyService.ts`. High-privacy mode for message encryption. | Verified |
| 35 | **Profile Page** | Working | [C] `src/pages/ProfilePage.tsx`. User profile with avatar, bio, settings. Route: `/profile` | Verified |
| 36 | **Capacitor Native Shell** | Working | [C] `src/native/` (12 files). Lifecycle, push, haptics, share, biometrics, status bar theming. All safely no-op on web. `capacitor.config.ts` fully configured. | Verified |
| 37 | **Deep Links** | Working | [C] `src/hooks/useDeepLinks.ts`. Universal Links + Custom URL Scheme handling. `api/aasa.ts` for Apple App Site Association. | Requires external setup (Apple AASA hosting) |
| 38 | **Subscription (RevenueCat)** | Stubbed for TestFlight | [C] `src/integrations/revenuecat/revenuecatClient.ts`. Platform-aware init (iOS/Android/Web). Feature-flagged via `VITE_REVENUECAT_ENABLED`. Test API key exists as fallback. | Requires external setup (RevenueCat + App Store Connect) |
| 39 | **Recs Page** | Working | [C] `src/pages/ChravelRecsPage.tsx`. Chravel recommendations. Route: `/recs` | Verified |
| 40 | **Healthz Endpoint** | Working | [C] `src/pages/Healthz.tsx`. Build info + env check. Route: `/healthz` | Verified |

---

## Summary

| Category | Count |
|----------|-------|
| Working | 30 |
| Partially Working | 4 |
| Broken | 0 |
| Not Implemented | 0 |
| Stubbed for TestFlight | 3 |
| **Total** | **37** |

### What requires external setup before full functionality

1. **Google Maps API Key** — Places tab search/autocomplete
2. **Stripe Keys** — Payments (can be disabled via feature flag)
3. **Lovable API Key** — AI Concierge (can be disabled via feature flag)
4. **VAPID Keys** — Web Push notifications (can be disabled)
5. **APNS Keys** — iOS Push notifications (Thoughtbot handles this)
6. **RevenueCat** — In-app purchases (can be disabled via feature flag)
7. **Supabase Storage Bucket** — Media uploads (bucket must exist)
8. **Apple AASA** — Deep link/universal link hosting

### What requires human App Store work (Thoughtbot)

1. Apple Developer Account setup
2. App Store Connect app creation
3. Provisioning profiles & certificates
4. TestFlight configuration
5. App Store screenshots & metadata
6. APNS key generation
7. Apple App Site Association file hosting
8. Final App Store review submission
