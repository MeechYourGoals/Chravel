# Chravel — Known Risks & Edge Cases

> Last updated: 2026-02-05 (automated audit)

## Severity Legend

| Level | Definition |
|-------|-----------|
| **P0 — Blocker** | Prevents app from being used in TestFlight/App Store review or breaks core flows |
| **P1 — Major** | Breaks important feature tabs or causes data loss, but app still loads |
| **P2 — Minor** | UX issues, visual glitches, edge-case errors without user impact |

---

## RESOLVED Issues (Fixed in This Audit)

### R1. `window.location.reload()` destroys Capacitor WebView context — **P0 RESOLVED**
- **Impact**: 10 call sites across ErrorBoundary, LazyRoute, App.tsx, payment dialogs, map, subscription paywall
- **Fix**: Created `src/utils/safeReload.ts` — uses `window.location.replace()` on native to avoid context destruction
- **Regression test**: Typecheck + build pass; all paths use `safeReload()` instead

### R2. Playwright config port mismatch — **P2 RESOLVED**
- **Impact**: E2E tests couldn't connect to dev server
- **Fix**: Updated `playwright.config.ts` to use port 8080 matching vite.config.ts

---

## OPEN Risks

### O1. Hardcoded Supabase credentials in client.ts — **P1**
- **File**: `src/integrations/supabase/client.ts:37-38`
- **Detail**: Default URL and anon key are hardcoded. The anon key is a public key (safe to expose), but the hardcoding means builds without env vars silently connect to a specific project.
- **Risk**: If the Supabase project is deleted/migrated, all env-var-less builds break.
- **Mitigation**: Already logged as TODO in code. For production, env vars MUST be set.

### O2. No RLS audit for all edge functions — **P1**
- **File**: `supabase/functions/` (69 functions)
- **Detail**: Edge functions use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. Functions must implement their own authorization checks.
- **Risk**: A missing auth check in an edge function could expose data.
- **Mitigation**: Each function should validate the JWT from the request. Existing functions appear to do this but a comprehensive audit is recommended.

### O3. Main JS bundle is 1MB — **P2**
- **File**: `dist/assets/js/index-*.js` (~1,010 KB, 275 KB gzipped)
- **Detail**: Contains core framework code. Already has code-splitting and manual chunks.
- **Risk**: Slower initial load on 3G connections (2-3 seconds at 275KB gzipped)
- **Mitigation**: Acceptable for native app (loaded from local disk). For web, consider further chunking.

### O4. 15 npm audit vulnerabilities — **P2**
- **Detail**: 7 moderate, 6 high, 2 critical. Most in dev dependencies (storybook, vitest).
- **Risk**: No production risk if dev dependencies aren't bundled (they aren't via Vite).
- **Mitigation**: Run `npm audit` and address high/critical in production deps if any.

### O5. Demo mode data leaking into production UI — **P2**
- **File**: `src/services/demoModeService.ts` (37KB)
- **Detail**: Demo mode has comprehensive mock data. If `VITE_ENABLE_DEMO_MODE` is accidentally `true` in production, users see fake trips.
- **Risk**: Low — feature flag defaults to `false` in production config.
- **Mitigation**: Validate env before deploy.

### O6. Token validation on mount may sign out users during transient errors — **P2**
- **File**: `src/App.tsx:260-390`
- **Detail**: On mount, the app validates the JWT and signs out if token parsing or refresh fails. During network blips, this could sign out users unnecessarily.
- **Risk**: User frustration on poor networks.
- **Mitigation**: Code already has comment "Don't clear session on validation error — might be transient" (line 385). The aggressive sign-out only triggers for truly corrupted tokens.

### O7. No server-side rendering for SEO / OG metadata on trip preview links — **P2**
- **File**: `unfurl/server.mjs`
- **Detail**: An unfurl server exists but may not be deployed. Without it, shared trip links on social media won't have rich previews.
- **Risk**: Poor social sharing experience.
- **Mitigation**: Deploy unfurl server or use Supabase edge function `get-trip-preview` for OG metadata.

---

## Edge Cases to Test on Device

### E1. Cold start from push notification tap
- **Scenario**: App is killed, user taps push notification
- **Expected**: App opens and routes to the correct trip/chat
- **Implementation**: `src/native/lifecycle.ts` captures push route in sessionStorage, flushes when React Router mounts
- **Risk**: Race condition if router mounts slowly

### E2. Background to foreground with expired token
- **Scenario**: App is in background for 1+ hours, token expires, user brings app to foreground
- **Expected**: Session refreshes silently; if refresh fails, redirect to auth
- **Implementation**: `src/App.tsx` validates token on mount; `onNativeResume` invalidates queries
- **Risk**: Brief loading state while token refreshes

### E3. Offline mode with queued actions, then reconnect
- **Scenario**: User is offline, creates a task, goes online
- **Expected**: Task syncs when connection restored
- **Implementation**: `src/offline/queue.ts` + `src/offline/sync.ts`
- **Risk**: Conflict if another user modified the same data while offline

### E4. Deep link with no auth session
- **Scenario**: User receives invite link, opens in app, has no account
- **Expected**: Show invite preview, prompt to sign in/up, then accept invite
- **Implementation**: `src/pages/JoinTrip.tsx` handles auth-gated join flow
- **Risk**: None identified — flow is well-implemented

### E5. Keyboard covering chat input on iOS
- **Scenario**: User opens chat, keyboard covers input field
- **Expected**: Input remains visible above keyboard
- **Implementation**: `capacitor.config.ts` has `Keyboard.resize: 'body'`; `src/native/nativeShell.ts` sets `--keyboard-height` CSS variable
- **Risk**: Some custom layouts may not respond to body resize

### E6. Rapid tab switching in trip detail
- **Scenario**: User rapidly switches between Chat, Calendar, Tasks, Polls tabs
- **Expected**: Each tab renders correctly without stale data
- **Implementation**: React lazy loading with Suspense boundaries
- **Risk**: Memory pressure on older devices with many tabs loaded

### E7. App Store review bot testing
- **Scenario**: Apple reviewer opens app for the first time
- **Expected**: Lands on landing page, can sign up or view demo
- **Risk**: If demo mode is disabled and no test account is provided, reviewer sees empty state. **Provide test account credentials in App Store review notes.**

---

## Recommendations for Thoughtbot

1. **Create a test account** for Apple reviewers and include credentials in the App Review Notes
2. **Test on physical iPhone** (not just simulator) for push notifications, biometrics, keyboard behavior
3. **Test on both WiFi and cellular** for network resilience
4. **Test with "Airplane Mode" toggle** for offline behavior
5. **Verify deep links** work from Messages, Notes, Safari
6. **Check memory usage** during extended sessions (especially chat with many messages)
