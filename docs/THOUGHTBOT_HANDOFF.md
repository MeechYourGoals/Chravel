# Chravel — Thoughtbot iOS Handoff Guide

> Last updated: 2026-03-16

## What's Already Done (Code-Level)

1. **Capacitor 8 configured** — `capacitor.config.ts` with iOS plugin settings (StatusBar overlay, Keyboard resize, SplashScreen)
2. **Native integration layer** — 12 files in `src/native/` handling lifecycle, push notifications, deep links, haptics, biometrics, share, status bar theming
3. **Safe reload utility** — `window.location.reload()` replaced with Capacitor-safe `safeReload()` across all production paths
4. **PWA manifest** — `public/manifest.json` with standalone display mode, portrait orientation, icons
5. **Safe area CSS** — Comprehensive `env(safe-area-inset-*)` support in `src/index.css`
6. **Offline support** — Service worker with Workbox precaching, IndexedDB offline queue, sync orchestration
7. **Build pipeline** — `npm run build` produces `dist/` as a single-page app ready for Capacitor sync
8. **RevenueCat integration** — `src/integrations/revenuecat/revenuecatClient.ts` with platform detection (iOS/Android/Web)
9. **Push notifications** — Both web (VAPID) and native (Capacitor PushNotifications + APNS) supported
10. **Deep links** — `src/hooks/useDeepLinks.ts` handles Universal Links and custom URL schemes
11. **Doctor script** — `npm run doctor` validates the entire stack in one command

---

## What Thoughtbot Must Do (Human Tasks)

### Phase 1: Apple Developer Setup

1. **Apple Developer Account**
   - Ensure enrollment in Apple Developer Program ($99/year)
   - Create App ID with bundle identifier `com.chravel.app`
   - Enable capabilities: Push Notifications, Associated Domains

2. **App Store Connect**
   - Create new app in App Store Connect
   - Set bundle ID: `com.chravel.app`
   - Fill in app metadata (name, subtitle, description, category: Travel)
   - Upload screenshots for required device sizes

3. **Certificates & Provisioning**
   - Create iOS Distribution Certificate
   - Create Development + Distribution Provisioning Profiles
   - Create APNS Key (push notifications)

### Phase 2: Capacitor iOS Project

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Add iOS platform (creates ios/ directory)
npx cap add ios

# 4. Sync web assets to native project
npx cap sync ios

# 5. Open in Xcode
npx cap open ios
```

### Phase 3: Xcode Configuration

1. **Signing & Capabilities**
   - Set Team to the Apple Developer account
   - Set Bundle Identifier to `com.chravel.app`
   - Enable Push Notifications capability
   - Enable Associated Domains (for deep links)
   - Add domain: `applinks:chravel.app`

2. **Info.plist**
   - Verify `CFBundleDisplayName` = "Chravel"
   - Add camera/photo library usage descriptions if media upload uses device camera
   - Add location usage description if Places uses device location

3. **Launch Screen / Splash**
   - Configure launch storyboard or splash screen assets
   - Match app theme (dark background `#181A21`, logo)

4. **App Icons**
   - Generate iOS icon set from `public/chravel-pwa-icon.png`
   - Needs 1024x1024 for App Store, plus all device sizes
   - Tool: https://appicon.co or Xcode asset catalog

### Phase 4: Environment Variables for iOS Build

Create `.env` with production values (see `docs/ENV_AND_APIS_REQUIRED.md` for full list).

**Minimum for TestFlight:**
```env
VITE_SUPABASE_URL=https://jmjiyekmxwsxkfnqwyaa.supabase.co
VITE_SUPABASE_ANON_KEY=<production anon key>
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_AI_CONCIERGE=false
VITE_ENABLE_STRIPE_PAYMENTS=false
VITE_ENABLE_PUSH_NOTIFICATIONS=false
VITE_REVENUECAT_ENABLED=false
```

### Phase 5: Push Notifications (iOS)

1. Generate APNS Key in Apple Developer Portal
2. Set Supabase secrets:
   ```bash
   supabase secrets set APNS_KEY_ID=<key-id>
   supabase secrets set APNS_TEAM_ID=<team-id>
   supabase secrets set APNS_PRIVATE_KEY=<private-key-content>
   supabase secrets set APNS_BUNDLE_ID=com.chravel.app
   supabase secrets set APNS_ENVIRONMENT=development  # 'production' for App Store
   ```
3. Test push notification delivery via TestFlight build

### Phase 6: Deep Links / Universal Links

1. Host Apple App Site Association (AASA) file at `https://chravel.app/.well-known/apple-app-site-association`
   - The app has `api/aasa.ts` that generates this; needs `APPLE_TEAM_ID` env var
   - Content:
     ```json
     {
       "applinks": {
         "apps": [],
         "details": [{
           "appID": "<TEAM_ID>.com.chravel.app",
           "paths": ["/trip/*", "/join/*", "/tour/*", "/event/*", "/accept-invite/*"]
         }]
       }
     }
     ```

### Phase 7: TestFlight

1. Archive the app in Xcode (Product > Archive)
2. Upload to App Store Connect
3. Create TestFlight internal testing group
4. Add beta testers
5. Distribute build

### Phase 8: App Store Submission

1. Complete all App Store metadata
2. Upload screenshots for all required sizes
3. Set app pricing (likely free with IAP)
4. Submit for review

---

## How to Run Tests

```bash
# Full health check
npm run doctor

# Individual checks
npm run typecheck       # TypeScript
npm run lint:check      # ESLint
npm run test:run        # Unit tests (vitest)
npm run build           # Production build

# E2E tests (requires Playwright browsers)
npx playwright install chromium
npm run test:e2e

# Environment validation
npm run validate-env
npm run validate-env -- --ios  # For iOS build
```

---

## Test Accounts

Test accounts should be created via the Supabase dashboard or the demo mode:

- **Demo mode**: Navigate to `/demo` to access pre-seeded demo data without authentication
- **Test user creation**: Use Supabase Auth dashboard to create test users with confirmed emails

---

## Key File Locations

| What | Where |
|------|-------|
| Capacitor config | `capacitor.config.ts` |
| Native integrations | `src/native/` (12 files) |
| PWA manifest | `public/manifest.json` |
| Service worker | `public/sw.js` (source), `scripts/build-sw.cjs` (builder) |
| Safe area CSS | `src/index.css:92-168` |
| Auth provider | `src/hooks/useAuth.tsx` |
| Supabase client | `src/integrations/supabase/client.ts` |
| RevenueCat | `src/integrations/revenuecat/revenuecatClient.ts` |
| Push notifications | `src/native/push.ts`, `src/services/notificationService.ts` |
| Deep links | `src/hooks/useDeepLinks.ts` |
| Build output | `dist/` |
| Edge functions | `supabase/functions/` (91 functions) |

---

## Known Limitations

1. **Google Maps**: Requires `VITE_GOOGLE_MAPS_API_KEY` for Places tab. Without it, map loads but search/autocomplete doesn't work.
2. **AI Concierge**: Requires `LOVABLE_API_KEY` Supabase secret. Disabled via feature flag for TestFlight.
3. **Payments**: Requires Stripe keys. Disabled via feature flag for TestFlight.
4. **RevenueCat**: Requires iOS API key from RevenueCat dashboard. Disabled via feature flag for TestFlight.
5. **Email notifications**: Requires Resend API key. Invites work via link-only without email.

---

## Emergency Contacts

- **Codebase questions**: See `CLAUDE.md` in repo root for AI coding standards
- **Architecture**: See `SYSTEM_MAP.md` in repo root for subsystem topology and failure modes
- **Env vars**: See `docs/ENV_AND_APIS_REQUIRED.md` for complete variable reference

---

## Backend Contracts & Invariants

These 7 contracts are load-bearing. Violating any of them will cause regressions or security issues.

### 1. Auth via Supabase Auth Only
All authentication goes through Supabase Auth. Session tokens are JWTs. Every API call (edge functions, realtime, storage) uses the Supabase client with the anon key + JWT. The single auth provider is `src/hooks/useAuth.tsx`. Never introduce alternative auth flows.

### 2. RLS Is Authoritative
Row-Level Security policies on every table are the **only** enforcement layer. Client-side permission checks (`useMutationPermissions`, `useRolePermissions`) are UX hints only — they can be wrong and the DB will still block unauthorized access. Never weaken or bypass RLS policies. Never trust client-supplied `user_id`, `trip_id`, or role.

### 3. Demo Mode Isolation
Demo mode (`/demo`) uses local mock data and a synthetic session. Never cross-contaminate demo data paths with authenticated data paths. The `useDemoMode` hook and `demoModeService` manage this boundary. Demo data must never touch the real database.

### 4. Trip Status Is Computed Client-Side
Trip status (upcoming / active / past) is computed from `start_date` and `end_date` fields. The logic lives in `src/utils/tripStatsCalculator.ts`. If building a native iOS app, this logic must be exactly replicated — there is no server-computed status field.

### 5. Idempotent Message Sends via `client_message_id`
Every chat message send must include a `client_message_id` (UUID generated client-side). This is the idempotency key that prevents duplicate messages on retry or reconnect. The realtime subscription uses this for deduplication. Omitting it will cause duplicate messages.

### 6. AI Writes Go Through Pending Actions Buffer
AI concierge tool calls that write to shared trip state (tasks, polls, calendar events, places) go through the `trip_pending_actions` table. Users must confirm or reject each action. The `tool_call_id` serves as an idempotency key. Read-only operations (search, recommendations) bypass the buffer. Never allow AI to write directly to trip data tables.

### 7. Subscription Truth Lives in the Database
The `user_subscriptions` table, populated by webhooks from RevenueCat and Stripe, is the source of truth for subscription status. Never trust client-side SDK state (`Purchases.getCustomerInfo()` or Stripe client) as authoritative — it can drift. Gate premium features on DB subscription status queried via hooks.

---

## Risk Zones & Known Gotchas

These are historically recurring issues. Awareness of them prevents repeat regressions.

### 1. Auth Hydration Race → Trip Not Found Flash
**The most common Chravel regression.** On hard refresh or direct URL navigation, Supabase Auth returns `null` during session hydration. If data fetches fire before auth resolves, the trip query returns nothing, causing a brief "Trip Not Found" flash before the real data loads. **Fix:** Gate all auth-dependent queries on session being fully hydrated (not just non-null). See `useAuth.tsx` hydration state.

### 2. WebSocket Reconnect Gap → Message Loss
Supabase Realtime does NOT replay missed events after a disconnect. If a user loses connectivity briefly, all messages sent during the gap are invisible until they refresh. **Fix:** On channel SUBSCRIBED status or `visibilitychange`, fetch messages since last known server timestamp and merge with dedup.

### 3. Read Receipt Write Amplification
A naive implementation marks ALL visible messages as read on every new message arrival. With 100+ messages in view, this creates N database writes per incoming message. **Fix:** Track which message IDs have already been marked read, and only write for new ones. Debounce at 1 second.

### 4. RevenueCat Platform-Specific API Keys
RevenueCat uses different API keys per platform: `appl_*` prefix for iOS, `rcb_*` for web. Using the wrong key will fail silently or return incorrect entitlements. The `revenuecatClient.ts` has platform detection — verify it uses the correct key for iOS builds.

### 5. Deep Links Require AASA File
Universal Links require an Apple App Site Association file hosted at `https://chravel.app/.well-known/apple-app-site-association`. The `api/aasa.ts` endpoint generates this. It needs the `APPLE_TEAM_ID` env var. Without it, deep links will open in Safari instead of the app. Supported paths: `/trip/*`, `/join/*`, `/tour/*`, `/event/*`, `/accept-invite/*`.

### 6. Offline Queue Sync Contract
The IndexedDB-based offline queue batches mutations when offline and replays them on connectivity restore. Each queued operation has an idempotency key. The sync orchestration is in `src/services/offlineSyncService.ts`. If building a native iOS offline layer, replicate the same sync contract (idempotency keys, replay order, conflict resolution).

---

## Architecture Mental Model

For a quick overview of all 12 subsystems, their dependencies, failure modes, and sources of truth, see **`SYSTEM_MAP.md`** in the repo root.

**Critical path:** Auth → Trips → Chat → Payments → AI Concierge → Calendar → Permissions → Notifications

**State layers:**
1. Auth state — `useAuth()` (Supabase session)
2. Server state — TanStack Query with cache keys (`src/lib/queryKeys.ts`)
3. Realtime — Supabase Realtime WebSocket subscriptions
4. Client state — Zustand stores (entitlements, demo mode, concierge session, notifications)
5. Feature flags — `public.feature_flags` table, 60s client cache

---

## iOS Feature Specs Reading Order

14 detailed specs exist in `docs/ios/` mapping web features to native iOS equivalents with Swift code examples:

| Order | File | Covers |
|-------|------|--------|
| 1 | `12-native-stack-mapping.md` | Web-to-iOS technology mapping (read first) |
| 2 | `01-trip-management.md` | Core trip CRUD, membership, invites |
| 3 | `03-chat-messaging.md` | Unified messaging, channels, reactions |
| 4 | `02-collaboration-sharing.md` | Sharing, collaboration features |
| 5 | `04-calendar-itinerary.md` | Calendar sync, events, RSVP |
| 6 | `05-tasks-polls.md` | Tasks and polls |
| 7 | `07-pro-team-tags-broadcasts.md` | Pro features, broadcasts |
| 8 | `08-notifications.md` | Push, in-app, email notifications |
| 9 | `10-billing-subscription.md` | RevenueCat/Stripe billing |
| 10 | `06-media-storage-quotas.md` | Media upload, compression, quotas |
| 11 | `09-settings-suite.md` | App settings |
| 12 | `11-data-sync-architecture.md` | Offline sync, data architecture |

**Appendices:**
- `appendix-edge-functions.md` — Edge function API contracts for iOS
- `appendix-supabase-tables.md` — Table schemas iOS must consume

---

## What NOT to Change Casually

These areas have complex invariants. Changes require understanding the full dependency chain:

- **`src/hooks/useAuth.tsx`** — Single auth provider. Changes can break every auth-gated route.
- **RLS policies** (in `supabase/migrations/`) — Security enforcement layer. Changes can create data leaks.
- **Payment hooks & services** — Revenue-critical. RevenueCat/Stripe webhook contracts are exact.
- **Realtime subscriptions** — Channel setup/cleanup patterns prevent memory leaks and data loss.
- **Demo mode boundaries** — `demoModeService.ts` and `useDemoMode` hook isolate demo from production data.
- **`src/integrations/supabase/client.ts`** — Singleton. Every DB query flows through this.
- **Message send pipeline** — `client_message_id` idempotency, realtime channel, offline queue all interlock.
