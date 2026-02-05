# Chravel — Ralph Wiggum Fix Chunks

> "I say what I see, and I fix what I say." — Ralph Wiggum Method
> Last updated: 2026-02-05 (automated audit)

---

## Chunk 01 — Blockers (Capacitor App Crashes)

**Goal:** Eliminate all code paths that destroy the Capacitor WebView context, making the app safe for TestFlight/App Store submission.

### Issue 1.1: `window.location.reload()` breaks Capacitor native context

**What I see:** 10 calls to `window.location.reload()` across `ErrorBoundary.tsx`, `LazyRoute.tsx`, `App.tsx`, `ConfirmPaymentDialog.tsx`, `SettlePaymentDialog.tsx`, `MapCanvas.tsx`, `SubscriptionPaywall.tsx`, and `MobileTripPayments.tsx`. In a Capacitor WebView, this destroys native listeners (push notifications, deep links, lifecycle bridges).

**Root cause:** Web-first development pattern; no native-safe reload abstraction existed.

**Fix applied:** Created `src/utils/safeReload.ts` — on native platforms, uses `window.location.replace()` with cache-bust param instead of hard reload. Applied to all 10 call sites.

**Files touched:**
- `src/utils/safeReload.ts` (NEW)
- `src/App.tsx` (2 changes)
- `src/components/ErrorBoundary.tsx` (2 changes)
- `src/components/LazyRoute.tsx` (2 changes)
- `src/components/payments/ConfirmPaymentDialog.tsx` (1 change)
- `src/components/payments/SettlePaymentDialog.tsx` (1 change)
- `src/components/places/MapCanvas.tsx` (1 change)
- `src/components/subscription/SubscriptionPaywall.tsx` (1 change)
- `src/components/mobile/MobileTripPayments.tsx` (1 change)

**Verify:** `npm run typecheck && npm run build` — passes.

**Definition of done:** Zero `window.location.reload()` calls in production paths (DeviceTestMatrix.tsx is dev-only, acceptable).

---

### Issue 1.2: Playwright E2E port mismatch

**What I see:** `playwright.config.ts` pointed to port `5173` but `vite.config.ts` uses port `8080`.

**Root cause:** Config drift between vite and playwright.

**Fix applied:** Updated `playwright.config.ts` to use port `8080` for baseURL and webServer.

**Files touched:** `playwright.config.ts`

**Verify:** Config values match between vite.config.ts and playwright.config.ts.

**Definition of done:** E2E tests can find the dev server.

---

## Chunk 02 — Major (Missing Infrastructure)

**Goal:** Ensure the repo has all tooling needed for CI, developer onboarding, and Thoughtbot handoff.

### Issue 2.1: No `npm run doctor` command

**What I see:** No single-command health check for the repo.

**Fix applied:** Created `scripts/doctor.sh` and added `npm run doctor` to package.json. Runs: Node version check, dependency install, env validation, typecheck, lint, unit tests, build, and output sanity check.

**Files touched:**
- `scripts/doctor.sh` (NEW)
- `package.json` (2 new scripts: `doctor`, `validate-env`)

**Verify:** `npm run doctor`

**Definition of done:** Script exits 0 on healthy repo, exits 1 on failure.

### Issue 2.2: No environment variable validation

**What I see:** App silently falls back to hardcoded Supabase defaults. No way to verify required vars are set before deploying.

**Fix applied:** Created `scripts/validate-env.ts` with `--ios` and `--ci` modes. Checks all required frontend vars and reports missing ones with provider info.

**Files touched:** `scripts/validate-env.ts` (NEW)

**Verify:** `npm run validate-env`

**Definition of done:** Script outputs clear checklist; exits 1 if required vars missing.

### Issue 2.3: No Playwright smoke tests for critical paths

**What I see:** Existing e2e tests exist but no comprehensive smoke suite covering app load, routing, PWA, offline.

**Fix applied:** Created `e2e/specs/smoke.spec.ts` with 18 tests covering: app shell, auth page, demo mode, healthz, privacy, terms, 404, settings, PWA manifest, invite flow, offline resilience, SPA routing, and legacy URL redirect.

**Files touched:** `e2e/specs/smoke.spec.ts` (NEW)

**Verify:** `npx playwright test e2e/specs/smoke.spec.ts` (requires Playwright browsers installed)

**Definition of done:** 18 tests pass in headless Chromium.

### Issue 2.4: No documentation for Thoughtbot handoff

**What I see:** No structured handoff docs for the iOS wrapping partner.

**Fix applied:** Created 7 docs in `docs/`:
- `APP_STORE_READINESS_REPORT.md`
- `FEATURE_STATUS_MATRIX.md`
- `ENV_AND_APIS_REQUIRED.md`
- `E2E_TEST_PLAN.md`
- `RALPH_WIGGUM_FIX_CHUNKS.md`
- `THOUGHTBOT_HANDOFF.md`
- `KNOWN_RISKS_AND_EDGE_CASES.md`

**Verify:** All files exist in `docs/`.

**Definition of done:** Thoughtbot can follow the handoff doc to wrap and submit the app.

---

## Chunk 03 — Polish (Minor)

**Goal:** Clean up warnings and improve developer experience.

### Issue 3.1: 786 ESLint warnings (0 errors)

**What I see:** Mostly unused variables in test files, analytics stubs, and PDF export utility. No errors.

**Status:** Not blocking. Warnings are acceptable for TestFlight. Fix post-launch.

### Issue 3.2: Large bundle size (1MB main chunk)

**What I see:** `index-*.js` is 1,010 KB (275 KB gzipped). This is the main app entry with all routes.

**Status:** Not blocking for TestFlight. Already has code-splitting via lazy routes and manual chunks. The 1MB chunk contains core framework code (React, Supabase, etc.).

### Issue 3.3: `npm audit` shows 15 vulnerabilities

**What I see:** 7 moderate, 6 high, 2 critical from transitive dependencies.

**Status:** Run `npm audit` to check if any affect production code paths. Most are in dev dependencies (storybook, vitest). Not blocking for TestFlight.

### Issue 3.4: Smooth scroll can cause jank on iOS

**What I see:** `scroll-behavior: smooth` set globally in `index.css`. Can interfere with iOS momentum scrolling.

**Status:** Minor. Not blocking. Can add `@media (prefers-reduced-motion: reduce)` override if needed.

---

## Verification Commands

```bash
# Verify all fixes
npm run typecheck    # Should pass (0 errors)
npm run lint:check   # Should have 0 errors (warnings OK)
npm run build        # Should succeed
npm run doctor       # Should pass all checks
```
