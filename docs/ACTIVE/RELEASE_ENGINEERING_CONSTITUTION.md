# Chravel Release Engineering Constitution

> **Purpose**: Governing rules for CI/CD, environments, migrations, feature flags, rollback, and release observability.
>
> **Last Updated**: 2026-03-16
> **Status**: Active — Stage A implemented, Stages B-D planned

---

## 1. Executive Summary

### Current State Assessment

| Area | Score | Status |
|------|-------|--------|
| Environment coherence | 45/100 | No staging. Preview is decorative. Prod auto-deploys on merge. |
| CI/CD reliability | 85/100 | Good gates: lint, typecheck, build, tests, e2e, deploy-safety. |
| Secrets/config discipline | 65/100 | 90+ vars documented. Validation expanded. No rotation process. |
| Migration safety | 55/100 | Conflicts resolved. No backward-compat testing. No rollback. |
| Feature flag/canary maturity | 25/100 | Env-var only. No kill switches. No runtime toggles. |
| Rollback realism | 40/100 | Web rollback works. Everything else is manual or impossible. |
| Release observability | 35/100 | No deploy markers. No health gates. No incident correlation. |
| Incident containment | 40/100 | Runbook created. No on-call. No automated alerting. |
| Testing / release readiness | 65/100 | 85 unit tests, 5 E2E specs. Chromium only. No coverage gates. |
| **Overall** | **51/100** | **Fragile but honest. Salvageable with staged hardening.** |

### Top Risks (Ranked)

1. **Web auto-deploys to production with no approval gate** — any merge to main goes live
2. **No staging environment** — no prod-like validation before production
3. **Migration rollback is impossible** — 306+ forward-only migrations
4. **Feature flags require redeployment** — no kill switches for incidents
5. **60+ edge function secrets with incomplete validation** — missing secret = silent failure
6. **No deploy-to-error correlation** — can't tie regressions to specific releases
7. **Parallel agent PRs risk migration conflicts** — no sequencing enforcement

---

## 2. Environment Constitution

| Environment | Purpose | Data | Trigger | Parity Requirement |
|-------------|---------|------|---------|---------------------|
| **Local** | Development | Mock/seed | Manual | Partial |
| **Preview** | PR validation | Dev Supabase | Auto per PR | Partial (web only) |
| **Staging** | Pre-prod validation | Sanitized prod copy | Merge to develop | Full parity (TO CREATE) |
| **Production** | Live users | Real data | Merge to main | Canonical |

### Rules

1. Production secrets MUST NEVER appear in preview/staging environments
2. Staging MUST run the same migrations as production
3. Preview environments are disposable — never treat as staging
4. All environments MUST use separate Supabase projects
5. Staging MUST have all the same edge functions deployed as production
6. "Prod-like enough" means: same schema, same edge functions, same feature flags, representative data volume

### What Must Never Be Shared Across Environments

- Database connection strings
- Service role keys
- Stripe secret keys (test vs live)
- VAPID private keys
- OAuth client secrets
- Webhook signing secrets

---

## 3. CI/CD Constitution

### Merge Requirements

- All PRs require at least one review (enforced by CODEOWNERS)
- PRs to `main` trigger deploy-safety analysis (migration, edge function, config impact)
- PRs modifying `supabase/migrations/` require explicit DB review
- All CI checks must pass before merge

### Pipeline Gates (in order)

1. `npm ci` — dependency install
2. `npm audit --audit-level=critical` — security audit
3. `npm run lint:budget` — linting with warning budget
4. `npm run typecheck` — TypeScript type checking
5. `npx tsx scripts/validate-env.ts --ci` — environment validation
6. `npm run test -- --run --coverage` — unit tests with coverage
7. `npm run build` — production build
8. E2E tests (Playwright, Chromium)

### Deploy Sequencing

**Safe deploy order** (when all surfaces change):
1. Database migrations (must complete before app code)
2. Edge functions (backend)
3. Web frontend (Vercel)
4. iOS app (separate release cycle)

**Never**: Deploy app code that depends on a migration before the migration runs.

### Hotfix Path

1. Branch from `main` (not `develop`)
2. PR directly to `main` with `hotfix/` prefix
3. All CI gates still apply — no `--no-verify`
4. After merge to `main`, cherry-pick back to `develop`
5. Document in post-incident review

### Release Tagging

- iOS releases: `v{major}.{minor}.{patch}` tags
- Web releases: Vercel deployment IDs (no tags currently)
- Stage B: Add deploy SHA + timestamp to telemetry for web

---

## 4. Migration Constitution

### Rules

1. All migrations MUST be timestamped: `YYYYMMDDHHMMSS_description.sql`
2. All migrations MUST be idempotent: `IF NOT EXISTS`, `CREATE OR REPLACE`
3. Schema-qualify all DDL: `public.table_name`, not bare `table_name`
4. Destructive changes MUST use two-phase approach:
   - Phase 1: Add new column/table, migrate data
   - Phase 2 (next deploy): Remove old column/table
5. No migration may drop a column/table that current app code references
6. Rollback = forward-fix. Document the forward-fix strategy in the PR.
7. Consolidation migrations allowed quarterly to clean up redundancy

### What Cannot Be Rolled Back

- Dropped tables or columns (data permanently lost)
- Destructive `UPDATE`/`DELETE` without backup
- Column type changes that lose precision
- These require restoring from backup (see Disaster Recovery doc)

### Migration PR Checklist

- [ ] Migration is timestamped and idempotent
- [ ] Uses `public.` schema qualification
- [ ] Backward-compatible with current app code
- [ ] Forward-fix strategy documented if rollback needed
- [ ] Tested locally with `supabase db push`

---

## 5. Feature Flag Constitution

### Current State (Env-Var Based)

| Flag | Default | Surface | Kill-Switch? |
|------|---------|---------|-------------|
| `VITE_ENABLE_AI_CONCIERGE` | true | Frontend | No (requires redeploy) |
| `VITE_ENABLE_STRIPE_PAYMENTS` | true | Frontend | No |
| `VITE_VOICE_LIVE_ENABLED` | true | Frontend | No |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | true | Frontend | No |
| `VITE_ENABLE_DEMO_MODE` | false | Frontend | N/A |
| `VITE_REVENUECAT_ENABLED` | true | Frontend | No |

### Rules

1. Critical paths (payments, auth, concierge, voice) MUST support kill switches
2. New risky features MUST launch behind a flag
3. Flags older than 90 days with 100% rollout MUST be cleaned up
4. Flag changes MUST be logged with timestamp and actor
5. Flags are safety infrastructure, not just product toggles

### Stage B Target: Runtime Flags

- Move critical flags to Supabase `feature_flags` table
- Enable toggle without redeploy
- Add `useFeatureFlag(key)` React hook with caching
- Kill switch = set `enabled = false` in Supabase dashboard

### Stale Flag Cleanup

- Review all flags monthly
- Remove flags that have been 100% enabled for > 90 days
- Document flag removal in PR description

---

## 6. Rollback Constitution

| Surface | Method | Time | Reversibility |
|---------|--------|------|---------------|
| Web code | Vercel promote previous | < 1 min | Full |
| Edge functions | Git revert + redeploy | 5-10 min | Full |
| Migrations | Forward-fix only | 15-60 min | Partial |
| Config/secrets | Manual dashboard | 2-5 min | Full |
| Feature flags (current) | Env var + redeploy | ~5 min | Full |
| Feature flags (Stage B) | DB toggle | < 1 min | Full |
| iOS app | Halt release | Hours-days | Partial |

### Decision Tree

See [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md) for the full decision tree and step-by-step procedures.

### Rollback Triggers

- Error rate > 5% post-deploy → immediate code rollback
- Core journey broken (auth, trips, payments) → rollback + kill switch
- Edge function 5xx rate spike → revert function
- Migration data issue → forward-fix migration

### Time-to-Decision Targets

| Severity | Decision Deadline |
|----------|------------------|
| P0 (auth, payments, data loss) | < 5 minutes |
| P1 (core feature broken) | < 15 minutes |
| P2 (non-core broken) | < 1 hour |

---

## 7. Release Observability Constitution

### Current State

- PostHog telemetry service exists (`src/telemetry/`)
- Sentry optional (not enforced)
- No deploy markers
- No post-deploy health checks
- No release dashboards

### Stage B Targets

1. **Deploy markers**: Inject `VITE_DEPLOY_SHA` and `VITE_DEPLOY_TIMESTAMP` at build time
2. **Post-deploy verification**: Automated smoke test hitting critical routes
3. **Error correlation**: Tag PostHog/Sentry events with deploy version

### Critical Smoke Journeys

These MUST work after every production deploy:

1. **Auth**: Sign in / sign out flow
2. **Trip creation**: Create a new trip
3. **Trip join**: Accept an invite
4. **Chat**: Send and receive a message
5. **Concierge**: Get an AI response
6. **Payments**: View billing page (no charge required)
7. **Calendar**: View events

### What "Healthy" Means After Deploy

- HTTP 200 on `/` and `/auth`
- Supabase connection successful
- No error rate increase > 2x baseline
- Critical journeys pass smoke test

---

## 8. Dangerous Failure Modes

| # | Failure | Severity | Likelihood | Root Cause | Fix |
|---|---------|----------|------------|------------|-----|
| 1 | Migration succeeds but app code breaks | CRITICAL | HIGH | No backward-compat testing | Stage C: migration compat tests |
| 2 | Web auto-deploys broken code to prod | CRITICAL | MEDIUM | No approval gate | Stage B: deploy gate workflow |
| 3 | Missing edge function secret | HIGH | HIGH | 60+ secrets, no validation | Done: expanded validate-env |
| 4 | Can't disable broken feature without redeploy | HIGH | HIGH | No runtime flags | Stage B: Supabase flags |
| 5 | No staging → false confidence | HIGH | CERTAIN | No staging env | Stage C: create staging |
| 6 | Rollback reverts code but not schema | HIGH | MEDIUM | No migration rollback | Done: documented in runbook |
| 7 | REVENUECAT forced-true | MEDIUM | CERTAIN | Code bug | Done: fixed `|| true` |
| 8 | Parallel agent PRs → migration conflicts | MEDIUM | HIGH | No sequencing | Done: deploy-safety workflow |
| 9 | Edge functions deploy without validation | MEDIUM | HIGH | No pre-deploy check | Done: hardcoded ID removed |
| 10 | No deploy-to-error correlation | MEDIUM | CERTAIN | No deploy markers | Stage B: telemetry |

---

## 9. Staged Hardening Plan

### Stage A: Immediate Fixes (DONE — this PR)

- [x] Fix REVENUECAT_ENABLED forced-true bug
- [x] Add PR template with deploy impact checklist
- [x] Add CODEOWNERS for critical paths
- [x] Harden CI: env validation step, audit level
- [x] Complete env documentation (90+ vars)
- [x] Fix duplicate migration (web_push_subscriptions)
- [x] Rename untimestamped migrations
- [x] Remove hardcoded Supabase project ID from deploy workflow
- [x] Add deploy-safety workflow for PRs to main
- [x] Create honest rollback runbook
- [x] Create this release engineering constitution

### Stage B: Short-Term (Next 2-4 Weeks)

- [ ] Production deployment approval gate (GitHub environment)
- [ ] Deploy markers in PostHog/Sentry telemetry
- [ ] Runtime feature flags in Supabase table
- [ ] Edge function TypeScript validation before deploy
- [ ] Incident response runbook with severity definitions
- [ ] Env validation for edge function secrets

### Stage C: Medium-Term (1-2 Months)

- [ ] Create staging environment (Vercel + Supabase)
- [ ] Post-deploy health gate automation
- [ ] Migration backward compatibility process
- [ ] Cross-browser E2E (Firefox, Safari/WebKit)
- [ ] Secret rotation documentation and schedule
- [ ] Release dashboard

### Stage D: Long-Term (Quarter+)

- [ ] Canary deployment via Vercel traffic splitting
- [ ] Feature flag service (LaunchDarkly or Flagsmith)
- [ ] Automated rollback triggers (error rate → auto-revert)
- [ ] Semantic versioning + automated changelog
- [ ] Contract tests for migration compatibility

---

## 10. AI-Assisted Development Safety

### Risks

- Multiple agents opening parallel PRs with overlapping migrations
- Generated code with hidden coupling between features
- Rapid merges outrunning environment discipline
- Agent-generated PRs bypassing review depth

### Mitigations

1. Deploy-safety workflow flags migration and edge function changes on PRs to main
2. CODEOWNERS ensures human review for critical paths
3. PR template requires explicit deploy impact assessment
4. Migration constitution requires idempotent, backward-compatible changes
5. All CI gates apply equally to human and agent PRs

---

## 11. Background System Coherence

Frontend, edge functions, migrations, and config changes MUST be treated as a coupled system when they share release assumptions.

### Deploy Order When Multiple Surfaces Change

1. **Migrations first** — schema must exist before code references it
2. **Edge functions second** — backend must support new schema
3. **Web frontend third** — UI can reference new backend features
4. **iOS last** — separate release cycle, must be backward-compatible

### What Must Deploy Together

- Migration adds column + edge function uses column → deploy together, migration first
- Edge function changes response format + frontend expects new format → deploy together, function first
- Feature flag in env + code behind flag → both must be present before feature activates

---

**"If it doesn't build, it doesn't ship. If it can't roll back safely, it ships with extra caution."**
