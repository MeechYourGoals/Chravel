# Chravel E2E Test Suite

This directory contains end-to-end tests for Chravel. This file intentionally separates what is implemented today from roadmap coverage to prevent false confidence.

## ✅ Implemented suites (source of truth)

- `e2e/specs/auth/full-auth.spec.ts`
- `e2e/specs/trips/trip-crud.spec.ts`
- `e2e/specs/rls/trip-rls.spec.ts`
- `e2e/specs/smoke.spec.ts`
- `e2e/specs/events/event-recap-export.spec.ts`
- `e2e/auth.spec.ts` (legacy)
- `e2e/chat.spec.ts` (legacy)
- `e2e/invite-links.spec.ts` (legacy)
- `e2e/offline-resilience.spec.ts`
- `e2e/settings.spec.ts`
- `e2e/trip-creation.spec.ts`
- `e2e/trip-flow.spec.ts`
- `e2e/tests/pwa-smoke.spec.ts`

## 🗺️ Planned suites (not yet implemented)

The following directories are part of the intended target architecture, but are not fully populated yet and should be treated as planned:

- `e2e/specs/profile/`
- `e2e/specs/invites/`
- `e2e/specs/chat/`
- `e2e/specs/calendar/`
- `e2e/specs/tasks/`
- `e2e/specs/polls/`
- `e2e/specs/payments/`
- `e2e/specs/media/`
- `e2e/specs/export/`
- `e2e/specs/subscriptions/`
- `e2e/specs/pro/`
- `e2e/specs/organizations/`

## 🚀 Running tests

```bash
npm run test:e2e
npx playwright test e2e/specs/auth/full-auth.spec.ts
```

### Required environment variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PLAYWRIGHT_TEST_BASE_URL=http://localhost:8080
```

## Governance rules

1. Tier-0 journeys are defined in `qa/journeys/tier0.json`.
2. Do not add new `test.skip` / `describe.skip` in critical suites without adding the file to `qa/journeys/skip-allowlist.json` and linking a follow-up issue.
3. Keep this README accurate: implemented suites only go in the Implemented section.
