# Chravel — Thoughtbot iOS Handoff Guide

> Last updated: 2026-02-05 (automated audit)

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
| Edge functions | `supabase/functions/` (69 functions) |

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
- **Architecture**: See `docs/APP_STORE_READINESS_REPORT.md` for full system overview
- **Env vars**: See `docs/ENV_AND_APIS_REQUIRED.md` for complete variable reference
