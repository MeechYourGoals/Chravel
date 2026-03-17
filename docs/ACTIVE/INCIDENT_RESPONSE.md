# Incident Response Runbook

> **Purpose**: Structured incident response for Chravel production issues.
> **Last Updated**: 2026-03-16
> **Status**: Active
> **Companion**: [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md)

---

## Severity Definitions

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| **P0** | Auth broken, data loss, payment failure, security breach | < 5 min to decision | Users can't sign in, charges without delivery, RLS leak |
| **P1** | Core feature broken for all users | < 15 min to decision | Trip creation fails, chat broken, map won't load |
| **P2** | Non-core feature broken or degraded | < 1 hour to decision | AI Concierge down, push notifications failing, OCR broken |
| **P3** | Cosmetic or minor UX issue | Next business day | Styling glitch, non-blocking error in console |

---

## Decision Tree

```
Incident Detected
    |
    v
[1] ASSESS SEVERITY (< 2 min)
    - Who is affected? (all users / subset / single user)
    - What is broken? (auth / data / payments / feature)
    - Is data at risk? (loss / corruption / leak)
    |
    v
[2] DECIDE ACTION (< 3 min for P0)
    |
    +-- Kill Switch Available? ──> Toggle feature flag in Supabase (< 1 min)
    |                               Table: public.feature_flags
    |                               Set enabled = false for affected feature
    |
    +-- Recent Deploy? ──> Rollback via Vercel Dashboard (< 2 min)
    |                       See: ROLLBACK_RUNBOOK.md
    |
    +-- Database Issue? ──> Do NOT rollback migrations
    |                        Forward-fix only (see Migration section)
    |
    +-- Edge Function? ──> Redeploy previous version
    |                       `supabase functions deploy <name> --project-ref <id>`
    |
    +-- None of above ──> Forward-fix with hotfix branch
    |
    v
[3] VERIFY FIX
    - Health check: curl $SUPABASE_URL/functions/v1/health
    - Smoke test: npx tsx scripts/smoke-test.ts
    - Check error rate in PostHog
    |
    v
[4] COMMUNICATE
    - Update team (use template below)
    - If P0/P1: update any status page
    |
    v
[5] POST-INCIDENT REVIEW (within 48 hours)
    - Fill in Post-Incident Review template below
```

---

## Kill Switch Procedures

### Disable a Feature (< 1 min, no redeploy)

Feature flags are stored in `public.feature_flags` table. To disable:

**Via Supabase Dashboard**:
1. Go to Table Editor > `feature_flags`
2. Find the row with key = `<feature_name>`
3. Set `enabled` = `false`
4. The change is live within 60 seconds (client cache TTL)

**Via SQL Editor**:
```sql
UPDATE public.feature_flags
SET enabled = false, updated_at = now()
WHERE key = 'ai_concierge';  -- or: voice_live, stripe_payments, push_notifications
```

**Available kill switches**:
| Flag Key | Feature | Impact of Disable |
|----------|---------|------------------|
| `ai_concierge` | AI trip assistant | Concierge tab shows "temporarily unavailable" |
| `voice_live` | Gemini Live voice | Voice button hidden |
| `stripe_payments` | Payment processing | Payment UI hidden, billing page shows message |
| `push_notifications` | Web push | Notification opt-in hidden |
| `demo_mode` | Demo/mock mode | Enables mock data for testing |

### Re-enable a Feature
Same process in reverse — set `enabled` = `true`.

---

## Web Frontend Rollback

See [ROLLBACK_RUNBOOK.md](./ROLLBACK_RUNBOOK.md) for detailed steps.

**Quick reference**:
1. Go to Vercel Dashboard > Deployments
2. Find last known good deployment
3. Click "..." > "Promote to Production"
4. Verify: load app in browser, check health endpoint

---

## Edge Function Rollback

1. Identify the broken function
2. Check git log for last good commit: `git log --oneline supabase/functions/<name>/`
3. Checkout that version: `git checkout <commit> -- supabase/functions/<name>/`
4. Deploy: `supabase functions deploy <name> --project-ref <project_id>`
5. Verify: `curl $SUPABASE_URL/functions/v1/<name>` returns expected response

---

## Communication Templates

### Internal Notification (Slack/Discord)
```
INCIDENT: [P0/P1/P2] — [Brief description]
Status: [Investigating / Mitigated / Resolved]
Impact: [Who is affected and how]
Action: [What was done / what's being done]
ETA: [When we expect resolution]
Lead: [Who is handling this]
```

### Post-Incident Review Template

```markdown
## Post-Incident Review: [Title]

**Date**: YYYY-MM-DD
**Severity**: P0 / P1 / P2
**Duration**: [Detection to resolution]
**Lead**: [Name]

### Timeline
- HH:MM — [What happened]
- HH:MM — [Detection method]
- HH:MM — [Action taken]
- HH:MM — [Resolution confirmed]

### Root Cause
[What caused the incident]

### Impact
- Users affected: [number/percentage]
- Duration of impact: [time]
- Data loss: [yes/no, details]

### What Went Well
- [...]

### What Could Be Improved
- [...]

### Action Items
- [ ] [Preventive measure 1] — Owner: [name] — Due: [date]
- [ ] [Preventive measure 2] — Owner: [name] — Due: [date]
```

---

## Escalation Contacts

| Role | Contact | When to Escalate |
|------|---------|-----------------|
| Engineering Lead | [Add contact] | P0/P1 incidents |
| Product Owner | [Add contact] | User-facing impact decisions |
| Infrastructure | [Add contact] | Supabase/Vercel platform issues |

---

## Monitoring Checklist

### What to Check During an Incident

1. **PostHog**: Error events, session recordings of affected users
2. **Vercel**: Deployment status, function logs, error rate
3. **Supabase Dashboard**: Database health, edge function logs, realtime status
4. **Health endpoint**: `curl $SUPABASE_URL/functions/v1/health`
5. **Browser console**: Client-side errors on affected pages

### Deploy Correlation

Every deploy injects `VITE_DEPLOY_SHA` and `VITE_DEPLOY_TIMESTAMP` into telemetry events. To correlate errors to a deploy:

1. In PostHog, filter events by `deploy_sha` property
2. Compare error rate before/after the deploy timestamp
3. If spike correlates with deploy → rollback candidate
