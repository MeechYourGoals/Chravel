---
name: chravel-release-readiness
description: Pre-release checklist for Chravel deploys to Vercel production. Covers build validation, auth flows, critical paths, mobile testing, and rollback planning. Use before any production deploy. Triggers on "ready to deploy", "release checklist", "can we ship this", "pre-deploy check".
disable-model-invocation: true
---

# Chravel Release Readiness

Verify Chravel is ready for production deployment on Vercel.

## Pre-Deploy Checklist

### 1. Build Validation
- [ ] `npm run lint` — zero errors
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds (simulates Vercel build)
- [ ] No new console.log or console.error in committed code

### 2. Critical Path Verification
- [ ] Auth flow: Login → Session → Protected routes work
- [ ] Trip loading: Demo trip, owned trip, shared trip all load
- [ ] Trip Not Found: Non-existent trip shows 404, not broken page
- [ ] Invite flow: Join link → auth → trip access works
- [ ] Chat: Messages send and receive via realtime
- [ ] Calendar: Events create and display correctly
- [ ] Payments: Balance displays, payment requests work

### 3. Mobile / PWA
- [ ] Mobile layouts render correctly (no overflow, no hidden content)
- [ ] Touch targets are adequate (44px+)
- [ ] PWA install prompt works
- [ ] Service worker updates don't break cached state

### 4. AI Features
- [ ] AI Concierge responds correctly
- [ ] Smart Import parses documents
- [ ] Gemini Live voice (if applicable) connects and works

### 5. Security
- [ ] No hardcoded API keys or secrets
- [ ] RLS policies unchanged or reviewed
- [ ] Auth gates present on all protected routes
- [ ] No client-side trust of user identity

### 6. Database
- [ ] Migrations applied (if any)
- [ ] New tables have RLS policies
- [ ] No breaking schema changes without migration plan

### 7. Environment
- [ ] Vercel environment variables set for new features
- [ ] No new dependencies require environment configuration
- [ ] Feature flags configured correctly

### 8. Rollback Plan
- [ ] Previous working deploy identified
- [ ] Database rollback plan if migrations were applied
- [ ] Feature flag kill switches available if needed

## Output

- **Status:** SHIP / SHIP WITH CAVEATS / NOT READY
- **Blockers:** List any blocking issues
- **Risks:** Known risks with mitigation
- **Rollback:** Exact rollback procedure
