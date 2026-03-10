# Chravel Loop Playbooks

Production-ready `/loop` templates for Chravel engineering workflows. Each follows the canonical loop schema.

---

## 1. PR Babysitting

**Objective:** Monitor a PR until it's merge-ready (CI green + reviews resolved).

```yaml
objective: "Monitor PR #{number} until CI passes and all review comments are resolved"
interval: "10m"
max_runtime: "8h"
success_condition: "CI green AND reviewDecision=APPROVED AND 0 unresolved threads"
failure_condition: "Same test failing 3 consecutive checks"
escalation_condition: "Reviewer requests architectural change or scope expansion"
allowed_actions:
  - read PR status, checks, comments via gh
  - spawn worktree subagent to fix lint/type/test failures
  - push fix commits to PR branch
approval_required_for:
  - changes to files not in the original PR
  - schema/migration changes
  - auth/RLS modifications
artifacts_to_read:
  - "gh pr view {number} --json state,reviewDecision,statusCheckRollup,reviewThreads"
artifacts_to_write:
  - "tmp/loop-status/pr-{number}.md"
  - "tmp/loop-history/{date}-pr-{number}.jsonl"
notify_when_done: "Inline summary with merge readiness assessment"
```

**Command:**
```
/loop 10m babysit PR #247. Read status via gh. If CI fails, spawn a worktree subagent to fix it. If new review comments appear, address non-architectural ones. Write status to tmp/loop-status/pr-247.md each iteration. Stop when CI is green and all threads are resolved, or after 3 consecutive identical failures.
```

---

## 2. Vercel Deploy Monitoring

**Objective:** Watch a Vercel deployment until it succeeds or fails definitively.

```yaml
objective: "Monitor latest Vercel deployment until terminal state"
interval: "3m"
max_runtime: "30m"
success_condition: "Deployment state = READY"
failure_condition: "Deployment state = ERROR or BUILD_ERROR"
escalation_condition: "Deployment stuck in BUILDING for >15 minutes"
allowed_actions:
  - check deployment status via Vercel MCP
  - read build logs on failure
  - summarize error and suggest fix
approval_required_for:
  - triggering a new deployment
  - modifying vercel.json or env vars
artifacts_to_read:
  - Vercel deployment status (via MCP tools)
  - Build logs (on failure only)
artifacts_to_write:
  - "tmp/loop-status/deploy-watch.md"
notify_when_done: "Summary with deploy URL or failure diagnosis"
```

**Command:**
```
/loop 3m check the latest Vercel deployment status. If READY, report the URL and stop. If ERROR, read build logs, diagnose the issue, and suggest a fix. If BUILDING for >15 min, flag as stuck. Write status to tmp/loop-status/deploy-watch.md.
```

---

## 3. Supabase Migration / RLS Verification

**Objective:** After a migration, verify schema changes applied and RLS policies are intact.

```yaml
objective: "Verify migration applied correctly and RLS policies protect affected tables"
interval: "5m"
max_runtime: "30m"
success_condition: "Schema matches expected state AND RLS queries return correct access patterns"
failure_condition: "Missing columns, broken policies, or unauthorized access detected"
escalation_condition: "RLS policy allows access it shouldn't (security critical)"
allowed_actions:
  - read Supabase schema via SQL queries
  - verify RLS policies exist on affected tables
  - test access patterns (member vs non-member vs anon)
  - compare against expected schema definition
approval_required_for:
  - any SQL writes or policy modifications
  - creating new migrations
artifacts_to_read:
  - migration files in supabase/migrations/
  - current RLS policies via supabase CLI or SQL
artifacts_to_write:
  - "tmp/loop-status/migration-verify.md"
notify_when_done: "Schema verification report with pass/fail per table"
```

**Command:**
```
/loop 5m verify the latest Supabase migration. Check that affected tables have correct columns and RLS policies. Test that trip members can read, non-members cannot, and anon gets nothing. If any policy is missing or wrong, STOP immediately and report. Write status to tmp/loop-status/migration-verify.md. Max 30 minutes.
```

---

## 4. Ralph Supervision

**Objective:** Monitor Ralph's autonomous development progress and flag if stuck.

```yaml
objective: "Supervise Ralph's iteration progress on the current feature"
interval: "10m"
max_runtime: "4h"
success_condition: "All stories in prd.json have passes=true"
failure_condition: "Same story failing 3+ iterations OR no commits in 30 minutes"
escalation_condition: "Ralph is stuck on a story that touches auth, RLS, or billing"
allowed_actions:
  - read scripts/ralph/prd.json
  - read scripts/ralph/progress.txt
  - read git log for recent commits
  - summarize progress percentage
approval_required_for:
  - modifying prd.json
  - intervening in Ralph's branch
artifacts_to_read:
  - "scripts/ralph/prd.json"
  - "scripts/ralph/progress.txt"
  - "git log --oneline -5"
artifacts_to_write:
  - "tmp/loop-status/ralph-supervisor.md"
  - "tmp/loop-history/{date}-ralph-supervisor.jsonl"
notify_when_done: "Feature completion summary with commit list"
```

**Command:**
```
/loop 10m supervise Ralph. Read prd.json and progress.txt. Report: stories done vs total, current story, last commit time. If no new commits in 30 min, flag as stuck. If all stories pass, report completion. Write status to tmp/loop-status/ralph-supervisor.md.
```

---

## 5. Post-Deploy Smoke Checks

**Objective:** After a Vercel deploy completes, run critical path verification.

```yaml
objective: "Verify critical Chravel flows work after deployment"
interval: "5m"
max_runtime: "30m"
success_condition: "All smoke checks pass for 2 consecutive iterations"
failure_condition: "Any critical path broken (Trip Not Found, auth failure, blank screen)"
escalation_condition: "Trip loading or auth broken — rollback may be needed"
allowed_actions:
  - check deployment health
  - verify key endpoints respond
  - check for console errors in known flows
  - report pass/fail per flow
approval_required_for:
  - triggering rollback
  - hotfix deployments
artifacts_to_read:
  - deployment URL
  - recent git changes (to know what to focus on)
artifacts_to_write:
  - "tmp/loop-status/smoke-check.md"
notify_when_done: "Smoke check report: all green or specific failures"
```

**Command:**
```
/loop 5m run post-deploy smoke checks. Verify: trip loading (no Trip Not Found), auth flow, map rendering, chat connectivity, calendar display. Report pass/fail for each. If all pass 2x in a row, stop with green status. If Trip Not Found detected, STOP immediately and escalate. Max 30 min.
```

---

## 6. Invite Acceptance / Trip Recovery Monitor

**Objective:** Watch for trip invite failures and membership creation mismatches.

```yaml
objective: "Monitor invite acceptance flow for Trip Not Found, auth desync, and membership creation failures"
interval: "15m"
max_runtime: "2h"
success_condition: "No new invite failures in 3 consecutive checks"
failure_condition: "Trip Not Found on invite link OR membership not created after acceptance"
escalation_condition: "Auth desync — user authenticated but trip_members row missing"
allowed_actions:
  - check Supabase logs for invite-related errors
  - query trip_members for recent invites
  - compare invite_links vs trip_members counts
  - read recent error patterns
approval_required_for:
  - modifying invite flow code
  - updating RLS policies
artifacts_to_read:
  - invite-related Supabase queries
  - recent trip_members inserts
  - error logs
artifacts_to_write:
  - "tmp/loop-status/invite-monitor.md"
notify_when_done: "Invite health report"
```

**Command:**
```
/loop 15m monitor invite acceptance health. Check for Trip Not Found errors on invite links, verify membership creation after acceptance, detect auth desync (authenticated user + missing membership). Write status to tmp/loop-status/invite-monitor.md. If auth desync detected, escalate immediately.
```

---

## 7. AI Concierge Regression Watch

**Objective:** Verify AI concierge responses haven't regressed after code changes.

```yaml
objective: "Re-run representative AI concierge prompts and diff output format for regressions"
interval: "30m"
max_runtime: "3h"
success_condition: "All test prompts return well-formatted, contextual responses"
failure_condition: "Broken card rendering, markdown leakage, fake-success responses, or hallucinated data"
escalation_condition: "Concierge returns trip data for wrong trip or leaks cross-trip information"
allowed_actions:
  - send test prompts to concierge endpoint
  - compare response format against expected patterns
  - check for markdown/HTML leakage in responses
  - verify card components render without errors
approval_required_for:
  - modifying AI prompts or system instructions
  - changing concierge API contracts
artifacts_to_read:
  - recent changes to AI/concierge code
  - concierge response format specs
artifacts_to_write:
  - "tmp/loop-status/concierge-regression.md"
notify_when_done: "Regression report with per-prompt pass/fail"
```

**Command:**
```
/loop 30m run AI concierge regression checks. Test prompts: "what's on the itinerary?", "who's coming?", "suggest a restaurant nearby", "what do I owe?". Check responses for: valid JSON/card format, no markdown leakage, no hallucinated names/dates, correct trip context. Compare against last iteration. Write to tmp/loop-status/concierge-regression.md.
```

---

## 8. Smart Import Smoke Tests

**Objective:** Verify smart import handles known-good inputs correctly after changes.

```yaml
objective: "Re-run smart import test corpus and verify parsing accuracy"
interval: "30m"
max_runtime: "2h"
success_condition: "All test imports produce expected structured output"
failure_condition: "Any import returns empty, malformed, or hallucinated data"
escalation_condition: "Import creates duplicate entries or overwrites existing itinerary items"
allowed_actions:
  - run import against test fixtures
  - compare output against expected results
  - check for duplicate creation
approval_required_for:
  - modifying import parsing logic
  - changing AI extraction prompts
artifacts_to_read:
  - test import fixtures
  - import parsing code changes
artifacts_to_write:
  - "tmp/loop-status/smart-import.md"
notify_when_done: "Import health report with per-format pass/fail"
```

**Command:**
```
/loop 30m smoke test smart import. Test inputs: URL share, pasted text itinerary, multi-day calendar export. Verify each produces correct structured output with dates, locations, and no duplicates. Compare with last iteration. Write to tmp/loop-status/smart-import.md. Stop if 2 consecutive clean runs.
```

---

## 9. Signed URL / Media Access Verification

**Objective:** Verify media access controls work correctly after storage changes.

```yaml
objective: "Verify signed URLs grant access to members and deny access to non-members and revoked users"
interval: "15m"
max_runtime: "1h"
success_condition: "Members get valid signed URLs, non-members get 403, revoked users get 403"
failure_condition: "Non-member or revoked user can access media"
escalation_condition: "ANY unauthorized access detected (security critical — hard stop)"
allowed_actions:
  - generate signed URLs for test assets
  - verify access control per role
  - check TTL and expiration behavior
approval_required_for:
  - modifying storage policies
  - changing signed URL generation logic
artifacts_to_read:
  - storage bucket policies
  - signed URL generation code
artifacts_to_write:
  - "tmp/loop-status/media-access.md"
notify_when_done: "Media access control verification report"
```

**Command:**
```
/loop 15m verify media access controls. Test: member gets signed URL (200), non-member gets rejected (403), revoked user gets rejected (403), expired URL returns 403. If ANY unauthorized access detected, STOP IMMEDIATELY and escalate. This is security-critical. Write to tmp/loop-status/media-access.md.
```

---

## 10. Billing Entitlement Parity Checks

**Objective:** Verify Stripe + RevenueCat + app DB entitlements stay in sync.

```yaml
objective: "Check billing entitlement consistency across Stripe, RevenueCat, and Supabase"
interval: "1h"
max_runtime: "3d"
success_condition: "All entitlement sources agree on plan status for test accounts"
failure_condition: "Mismatch between any two sources"
escalation_condition: "User has access to paid features without active subscription (revenue leak)"
allowed_actions:
  - query Supabase user entitlements
  - compare with expected Stripe subscription state
  - compare with expected RevenueCat entitlements
  - report mismatches
approval_required_for:
  - modifying billing code
  - updating subscription webhooks
  - changing entitlement logic
artifacts_to_read:
  - billing sync code
  - webhook handlers
  - entitlement query logic
artifacts_to_write:
  - "tmp/loop-status/billing-parity.md"
notify_when_done: "Entitlement parity report with per-account status"
```

**Command:**
```
/loop 1h check billing entitlement parity. For test accounts, verify Stripe subscription status matches RevenueCat entitlements matches Supabase user plan. Report any mismatches with account IDs. If a user has premium access without active subscription, escalate immediately. Write to tmp/loop-status/billing-parity.md.
```

---

## 11. Realtime/Chat Rendering Regression Watch

**Objective:** After deploys touching chat/activity, verify rendering and fanout.

```yaml
objective: "Verify chat messages render correctly and activity items don't overlap on mobile/web"
interval: "15m"
max_runtime: "1h"
success_condition: "Messages render, activity items are distinct, no overlap or missing elements"
failure_condition: "Messages not rendering, activity items overlapping, blank chat view"
escalation_condition: "Realtime subscription disconnected or messages not fanning out"
allowed_actions:
  - check Supabase realtime subscription status
  - verify chat component renders without errors
  - check for CSS overlap in activity feed
  - compare mobile vs desktop rendering
approval_required_for:
  - modifying realtime subscription logic
  - changing chat message schema
artifacts_to_read:
  - recent changes to chat/ or activity/ components
  - Supabase realtime channel config
artifacts_to_write:
  - "tmp/loop-status/chat-regression.md"
notify_when_done: "Chat/activity rendering health report"
```

**Command:**
```
/loop 15m check chat rendering health. Verify: messages render with correct sender/timestamp, activity items don't overlap, realtime subscription is connected, no blank states. Test both mobile and desktop viewports. Write to tmp/loop-status/chat-regression.md. Stop after 2 clean runs or 1 hour.
```

---

## 12. PWA/Mobile/Web Parity Checks

**Objective:** After UI changes, verify critical flows work across platforms.

```yaml
objective: "Compare critical user flows across PWA, mobile web, and desktop web"
interval: "30m"
max_runtime: "2h"
success_condition: "All critical flows work identically across platforms"
failure_condition: "Layout broken on mobile, touch targets too small, overflow issues"
escalation_condition: "Trip loading or navigation broken on any platform"
allowed_actions:
  - check responsive breakpoints in changed components
  - verify no overflow/scroll issues
  - check touch target sizes (44px minimum)
  - compare layout at 320px, 768px, 1024px, 1440px
approval_required_for:
  - layout/CSS architecture changes
  - responsive breakpoint modifications
artifacts_to_read:
  - recently changed component files
  - Tailwind responsive classes used
artifacts_to_write:
  - "tmp/loop-status/parity-check.md"
notify_when_done: "Cross-platform parity report"
```

**Command:**
```
/loop 30m check PWA/mobile/web parity. For recently changed components, verify: no horizontal overflow at 320px width, touch targets >= 44px, no text truncation that hides critical info, modals/sheets work on mobile. Write to tmp/loop-status/parity-check.md. Stop after 2 clean runs.
```

---

## 13. Error Budget Loop

**Objective:** If a bug persists, stop poking and escalate with root cause.

```yaml
objective: "Track a specific error and escalate if it persists beyond error budget"
interval: "10m"
max_runtime: "1h"
success_condition: "Error count drops to 0 for 2 consecutive checks"
failure_condition: "Error count stays same or increases for 3 consecutive checks"
escalation_condition: "3 consecutive checks with no improvement → root cause analysis required"
allowed_actions:
  - check error occurrence count/logs
  - compare with previous iteration
  - on failure budget exceeded: write root cause summary and stop
approval_required_for:
  - any code changes (this loop only observes)
artifacts_to_read:
  - error logs or monitoring output
  - "tmp/loop-status/error-budget-{issue}.md"
artifacts_to_write:
  - "tmp/loop-status/error-budget-{issue}.md"
notify_when_done: "Error budget report: resolved or root cause summary"
```

**Command:**
```
/loop 10m track the "{error description}" error. Count occurrences since last check. If same count 3x in a row with no improvement, STOP — write a root cause summary to tmp/loop-status/error-budget-{issue}.md with: error details, frequency, affected flows, hypotheses, and recommended fix approach. Do NOT keep poking.
```

---

## 14. Vercel Preview Post-Deploy Suite

**Objective:** After preview deploy, run a full verification suite.

```yaml
objective: "Comprehensive verification of Vercel preview deployment"
interval: "5m"
max_runtime: "20m"
success_condition: "Preview loads, all critical paths work, no console errors"
failure_condition: "Preview 404, blank screen, or critical path broken"
escalation_condition: "Trip Not Found on any trip route"
allowed_actions:
  - check preview URL responds
  - verify key routes load
  - check for build/runtime errors in Vercel logs
  - compare bundle size vs main branch
approval_required_for:
  - promoting preview to production
  - modifying build config
artifacts_to_read:
  - Vercel preview deployment info
  - build logs
  - bundle analysis
artifacts_to_write:
  - "tmp/loop-status/preview-verify.md"
notify_when_done: "Preview deployment verification report"
```

**Command:**
```
/loop 5m verify Vercel preview deployment. Check: preview URL responds 200, no build errors in logs, bundle size within 10% of main, key routes (/trips, /trip/{id}, /login) load without error. Write to tmp/loop-status/preview-verify.md. Stop after 2 clean checks or 20 min.
```

---

## 15. Morning Engineering Digest

**Objective:** Daily summary of overnight activity across GitHub, Slack, and monitoring.

```yaml
objective: "Generate morning engineering digest covering PRs, issues, deploys, and mentions"
interval: "1d (cron: 0 9 * * 1-5)"
max_runtime: "3d"
success_condition: "Digest generated and reported"
failure_condition: "Unable to access one or more data sources"
escalation_condition: "Critical issue detected in overnight activity"
allowed_actions:
  - read GitHub PRs and issues via gh
  - read Slack mentions via MCP
  - check Vercel deployment history
  - summarize and format digest
approval_required_for:
  - nothing (read-only digest)
artifacts_to_read:
  - GitHub: open PRs, new issues, failed checks
  - Slack: messages where user was tagged
  - Vercel: recent deployment status
artifacts_to_write:
  - "tmp/loop-status/morning-digest.md"
  - "tmp/loop-history/{date}-morning-digest.jsonl"
notify_when_done: "Inline digest summary"
```

**Command:**
```
/loop every day at 9am generate morning engineering digest. Check: open PRs and their CI status via gh, Slack messages I was tagged in via Slack MCP, Vercel deployments from last 24h. Format as structured digest with action items. Write to tmp/loop-status/morning-digest.md. Flag anything that needs immediate attention.
```

---

## Playbook Usage Notes

### Combining Playbooks

You can run multiple loops simultaneously (max 50). Common combos:

- **Deploy flow:** Vercel deploy monitor → (on success) → Post-deploy smoke → (on success) → Invite monitor
- **PR flow:** PR babysit → (on merge) → Deploy monitor → Smoke checks
- **Ralph flow:** Ralph supervisor + Error budget loop on the feature branch

### Customizing Templates

Each playbook is a starting point. Adjust:
- **Intervals** based on urgency
- **Max runtime** based on expected duration
- **Success/failure conditions** based on your specific acceptance criteria
- **Allowed actions** based on your trust level for this session

### When to Graduate

If you find yourself restarting the same playbook every session, it's time to move it to:
- Desktop Scheduled Tasks (for personal workflows)
- GitHub Actions (for team-shared automation)
- Headless SDK (for complex multi-step automation)

---

*Last Updated: 2026-03-08*
