# Rollback Runbook

> **Purpose**: Honest rollback procedures per deploy surface. Some rollbacks are instant; others require forward-fix. This document does not pretend all releases can be rolled back equally.
>
> **Last Updated**: 2026-03-16

---

## Decision Tree

```
Production incident detected
         │
         ▼
  Is the issue caused by code?
    YES → Rollback web code via Vercel (< 1 min)
    NO  ↓
         │
  Is the issue caused by an edge function?
    YES → Revert edge function via git revert + redeploy (5-10 min)
    NO  ↓
         │
  Is the issue caused by a feature flag?
    YES → Disable flag via env var change + redeploy (~5 min)
         (After B4: toggle in Supabase table, < 1 min)
    NO  ↓
         │
  Is the issue caused by a migration/schema change?
    YES → FORWARD-FIX ONLY (see Migration Rollback below)
    NO  ↓
         │
  Is the issue caused by config/secrets?
    YES → Revert in Supabase/Vercel dashboard (2-5 min)
    NO  ↓
         │
  Escalate and investigate.
```

---

## 1. Web Code Rollback (Vercel)

**Time**: < 1 minute
**Reversibility**: Full
**Method**: Vercel Instant Rollback

### Steps
1. Go to [Vercel Dashboard](https://vercel.com) → Chravel project → Deployments
2. Find the last known-good deployment
3. Click "..." → "Promote to Production"
4. Verify the site is serving the correct version

### Limitations
- Only reverts the web frontend
- Does NOT revert edge functions, migrations, or config changes
- If the broken deploy included coupled backend changes, web rollback alone may not fix the issue

---

## 2. Edge Function Rollback

**Time**: 5-10 minutes
**Reversibility**: Full
**Method**: Git revert + Supabase CLI deploy

### Steps
1. Identify the commit that introduced the broken function
2. ```bash
   git revert <commit-sha>
   git push origin main
   ```
3. The `deploy-functions.yml` workflow will auto-deploy on push to main
4. Alternatively, deploy manually:
   ```bash
   supabase functions deploy <function-name> --project-ref $PROJECT_ID
   ```
5. Verify the function is responding correctly

### Limitations
- If the function depends on a schema change, reverting the function without reverting the schema may create inconsistency
- Old function versions are not cached — there is no "instant rollback" for edge functions

---

## 3. Feature Flag Rollback

**Current State (env-var based)**:
- **Time**: ~5 minutes (requires redeploy)
- **Method**: Change env var in Vercel dashboard → trigger redeploy

### Steps
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Set the flag to `false` (e.g., `VITE_ENABLE_AI_CONCIERGE=false`)
3. Trigger a redeploy from the latest deployment

### Future State (after runtime flags in Supabase)
- **Time**: < 1 minute
- **Method**: Update `feature_flags` table in Supabase dashboard
- No redeploy required

---

## 4. Migration / Schema Rollback

> **CRITICAL: Migrations are FORWARD-FIX ONLY.**
> There are no down migrations. Rolling back a schema change requires writing and deploying a NEW migration that reverses the change.

**Time**: 15-60 minutes (write + test + deploy)
**Reversibility**: Partial — data changes may be irreversible

### Forward-Fix Process
1. **Assess**: Determine what the migration changed (columns, tables, functions, policies)
2. **Write**: Create a new migration that reverses the change:
   - Dropped column → Re-add with `ADD COLUMN IF NOT EXISTS`
   - Changed function → `CREATE OR REPLACE` with previous logic
   - Dropped table → Cannot recover data (forward-fix only)
   - Added constraint → `DROP CONSTRAINT IF EXISTS`
3. **Test**: Run against a local Supabase instance
4. **Deploy**: Apply via `supabase db push` or commit + deploy
5. **Verify**: Confirm app code works with the reverted schema

### What Cannot Be Rolled Back
- **Dropped tables or columns**: Data is permanently lost
- **Destructive data changes**: `UPDATE`/`DELETE` without backup
- **Column type changes**: May lose precision or data
- **These require restoring from backup** (see Disaster Recovery)

### Prevention
- All migrations must be backward-compatible for one deploy cycle
- Destructive changes require two-phase migration (add new → migrate → remove old)
- Test migrations locally before deploying to production

---

## 5. Config / Secret Rollback

**Time**: 2-5 minutes
**Reversibility**: Full
**Method**: Manual dashboard revert

### Supabase Secrets
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Update the secret value to the previous known-good value
3. Edge functions pick up the new secret on next invocation

### Vercel Environment Variables
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Update the variable value
3. Trigger a redeploy

### Limitations
- No version history for secrets — you must know the previous value
- Rotating a secret invalidates the old one at the provider level

---

## 6. iOS App Rollback

**Time**: Hours to days
**Reversibility**: Partial
**Method**: Halt release in App Store Connect

### Steps
1. Go to App Store Connect → Chravel → App Store tab
2. If the release is still in review: reject it
3. If the release is live: submit a new build with the fix
4. For critical issues: use "Remove from Sale" (nuclear option)

### Limitations
- Apple review takes 24-48 hours
- Users who already updated cannot be rolled back
- Critical fixes require expedited review request

---

## 7. Incident Severity Guide

| Severity | Definition | Time to Decision | Action |
|----------|-----------|-----------------|--------|
| P0 | Auth broken, data loss, payment failure | < 5 minutes | Immediate rollback + page team |
| P1 | Core feature broken (trips, chat, concierge) | < 15 minutes | Rollback or kill switch |
| P2 | Non-core feature broken, UI regression | < 1 hour | Forward-fix in next deploy |
| P3 | Cosmetic issue, non-blocking bug | Next business day | Normal PR flow |

---

## 8. Post-Rollback Checklist

- [ ] Verify the rollback resolved the issue
- [ ] Check error rates in PostHog/Sentry
- [ ] Verify critical journeys work (auth, trip creation, chat, payments)
- [ ] Notify the team about the rollback and root cause
- [ ] Create a ticket for the proper fix
- [ ] Schedule a post-incident review if P0/P1
