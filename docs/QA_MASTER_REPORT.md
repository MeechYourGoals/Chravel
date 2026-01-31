# QA Master Report — Chravel Regression Testing

**Date:** 2026-01-31
**Branch:** `claude/regression-testing-all-platforms-P21uZ`
**Performed By:** Claude Code (Principal Engineer + QA Lead)

---

## Executive Summary

Full regression analysis of the Chravel codebase for Capacitor iOS wrapping readiness.
Build passes. Typecheck passes. No blocking syntax or type errors.

**Overall Status: CONDITIONALLY READY** — 3 Blockers, 5 Major, 4 Minor issues identified.

---

## Phase 0 — Repo Discovery

| Item | Value |
|------|-------|
| Package Manager | npm |
| Node Version | 18+ (TypeScript 5.9) |
| Framework | React 18 + Vite 5 |
| Routing | React Router 6 (BrowserRouter) |
| Auth | Supabase Auth (email + Google OAuth) |
| Data Layer | Supabase (Postgres + RLS) |
| State | TanStack Query + Zustand |
| Styling | Tailwind CSS |
| Realtime | Supabase Realtime (postgres_changes) |
| Payments | RevenueCat (IAP) + Stripe (web fallback) |
| Native Shell | Capacitor 8 |
| Build Output | `dist/` (static SPA) |
| Main Bundle | 1,009 kB (275 kB gzip) — WARNING |

### Key Scripts

```
npm run dev          # Local dev server
npm run build        # Typecheck + Vite build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint --fix
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run cap:sync     # Build + Capacitor sync
npm run ios:open     # Open Xcode project
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Google Maps API key |
| `VITE_OAUTH_GOOGLE_ENABLED` | No | Toggle Google OAuth button |

Validation script: `npx tsx scripts/validate-env.ts`

---

## Phase 1 — Boot + Smoke

| Check | Status |
|-------|--------|
| `npm install` | ✅ Pass |
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass (37s, 1MB main chunk warning) |
| Homepage loads | ✅ Pass |
| Auth page loads | ✅ Pass |
| Healthz endpoint | ✅ Pass |
| 404 page renders | ✅ Pass |
| Privacy/Terms pages | ✅ Pass |

**Smoke E2E spec:** `e2e/specs/smoke/smoke.spec.ts` (10 tests)

---

## Phase 2 — Feature Regression Coverage

### E2E Specs Created

| Area | Spec File | Tests |
|------|-----------|-------|
| Smoke | `e2e/specs/smoke/smoke.spec.ts` | 10 |
| Auth | `e2e/specs/auth/auth-flow.spec.ts` | 5 |
| Trip Lifecycle | `e2e/specs/trips/trip-lifecycle.spec.ts` | 5 |
| Chat | `e2e/specs/chat/chat-flow.spec.ts` | 2 |
| Calendar | `e2e/specs/calendar/calendar-flow.spec.ts` | 2 |
| Pro Trips | `e2e/specs/pro/pro-trip.spec.ts` | 2 |
| PWA/Mobile | `e2e/specs/pwa/mobile-viewport.spec.ts` | 6 |

### Pre-existing Specs

| File | Coverage |
|------|----------|
| `e2e/auth.spec.ts` | Auth flows |
| `e2e/chat.spec.ts` | Chat messaging |
| `e2e/trip-creation.spec.ts` | Trip CRUD |
| `e2e/trip-flow.spec.ts` | Trip navigation |
| `e2e/invite-links.spec.ts` | Invite flow |
| `e2e/offline-resilience.spec.ts` | Offline handling |
| `e2e/settings.spec.ts` | Settings |
| `e2e/specs/rls/trip-rls.spec.ts` | RLS policies |
| `e2e/specs/trips/trip-crud.spec.ts` | Trip CRUD |

---

## Phase 3 — Issues Found

### Blockers (3)

| ID | Title | Area |
|----|-------|------|
| ISSUE-0001 | Main bundle exceeds 1MB — App Store may reject for slow load | Perf |
| ISSUE-0002 | `window.location.href` used for in-app navigation (breaks SPA in Capacitor) | Navigation |
| ISSUE-0003 | `window.open('_blank')` calls blocked in iOS WKWebView | Native |

### Major (5)

| ID | Title | Area |
|----|-------|------|
| ISSUE-0004 | `100vh` CSS units broken on mobile Safari (keyboard overlap) | PWA |
| ISSUE-0005 | `window.open` for mailto/sms links needs Capacitor plugin fallback | Native |
| ISSUE-0006 | Stripe checkout `window.open` won't work in native webview | Payments |
| ISSUE-0007 | CSP meta tag doesn't allow capacitor:// or ionic:// scheme | Native |
| ISSUE-0008 | No SPA fallback routing configured for Capacitor webview | Navigation |

### Minor (4)

| ID | Title | Area |
|----|-------|------|
| ISSUE-0009 | Duplicate `apple-mobile-web-app-capable` meta tag in index.html | PWA |
| ISSUE-0010 | `bundledWebRuntime` is deprecated in Capacitor 8 config | Config |
| ISSUE-0011 | Mobile viewport projects commented out in Playwright config | Testing |
| ISSUE-0012 | No `data-testid` attributes on critical interactive elements | Testing |

---

## Phase 4 — Capacitor Wrap Readiness

See: `docs/CAPACITOR_WRAP_READINESS.md`

**Verdict:** Wrapping is feasible after resolving Blockers ISSUE-0001 through ISSUE-0003 and Major issues ISSUE-0007 and ISSUE-0008.

---

## Phase 5 — Fix Priority Order

1. ISSUE-0002 — Replace `window.location.href` with React Router navigation
2. ISSUE-0003 — Replace `window.open` with Capacitor Browser plugin
3. ISSUE-0007 — Update CSP for Capacitor scheme
4. ISSUE-0008 — Add server.json or capacitor routing config
5. ISSUE-0001 — Code split large chunks further
6. ISSUE-0004 — Replace `100vh` with `dvh` + fallback
7. ISSUE-0005 — Add mailto/sms Capacitor intents
8. ISSUE-0006 — Use Capacitor InAppBrowser for Stripe
9. ISSUE-0009 — Remove duplicate meta tag
10. ISSUE-0010 — Remove deprecated bundledWebRuntime
11. ISSUE-0011 — Enable mobile Playwright projects ✅ DONE
12. ISSUE-0012 — Add data-testid attributes to key elements

See: `docs/FIX_CHUNKS.json`
