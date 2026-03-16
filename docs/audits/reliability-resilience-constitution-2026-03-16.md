# Chravel Reliability, Capacity, and Continuity Constitution Audit (2026-03-16)

## 1. Executive Summary
- **Current reliability model:** **Fragmented**, not coherent. Chravel has pieces (health checks, retries, offline queueing, circuit-breaker utility, security hardening work), but no single reliability policy that ties service criticality, SLOs, capacity limits, degradation order, and DR execution together.
- **Biggest availability/continuity risks:**
  1. No explicit tiered SLO/error-budget policy; on-call cannot answer “what must stay up first.”
  2. User-impact SLIs are not first-class; current checks are mostly component/service health and ad hoc logs.
  3. Dependency concentration in Supabase + provider APIs with limited tested isolation boundaries.
- **Biggest capacity risks:**
  1. No codified headroom or burst model for hot trips/event spikes.
  2. Queue/backlog thresholds are not enforced as operational guardrails.
  3. Realtime/chat/notifications likely to be first saturation domain under event-day fanout.
- **Biggest backup/restore/DR risks:**
  1. Existing DR docs themselves explicitly state “action required,” no proven restore drills, and undefined/aspirational RPO/RTO.
  2. Restore validation for business-critical objects is not systematically instrumented.
  3. No explicit severity-classed continuity playbooks for provider lockout/project-level failure.
- **Biggest graceful-degradation gap:** No explicit product-wide “shedding order” policy (write throttling, read-only mode, non-critical feature disablement, AI fallback posture, search staleness posture).
- **Is architecture salvageable?** Yes—with staged hardening. Core stack supports reliability uplift, but current posture is **unsafe for high-stakes pro/event dependence** without immediate reliability constitution + drills.

### Parallel Sub-Agent Delegation Results (Audit phase)

#### Agent 1 — Service Criticality + SLO Audit
- **Findings:** No canonical service-tier/SLO constitution checked into ops docs; health paths exist but do not represent end-to-end journey success.
- **Likely risks:** Alerting misses user pain; over-protection of non-critical surfaces while critical journeys silently degrade.
- **Root cause:** Architecture/docs evolved feature-first, not reliability-budget-first.
- **Governing rules needed:** Tier-0/1/2 definition, SLO SLIs per journey, release gating on error-budget burn.
- **Recommended fixes:** Define tier constitution now; add journey SLIs and burn-rate alerts.
- **Confidence:** High.
- **Unknowns:** Current production pager routing, actual target uptime commitments.

#### Agent 2 — Dependency + Failure Topology Audit
- **Findings:** Strong central dependency on Supabase (DB/Auth/Realtime/Storage/Edge Functions), plus external dependencies for AI, maps, billing, notifications.
- **Likely risks:** Provider/API latency spikes cascade into user-facing endpoints if no strict timeout/bulkhead behavior by path.
- **Root cause:** Dependency resilience utilities exist but are not formalized as mandatory contract per feature.
- **Governing rules needed:** Hard vs optional dependency matrix with failure behavior per surface.
- **Recommended fixes:** Introduce dependency policy table + kill switches + path-specific timeouts.
- **Confidence:** High.
- **Unknowns:** Per-provider quota limits and contracts in production plans.

#### Agent 3 — Capacity Planning Audit
- **Findings:** No explicit baseline/burst model recorded for event-scale traffic, queue depth budget, or fanout ceilings.
- **Likely risks:** Chat/realtime saturation and queue growth under hot-channel conditions.
- **Root cause:** Growth assumptions not converted into numeric operating envelopes.
- **Governing rules needed:** Headroom targets, queue thresholds, p95 latency envelopes.
- **Recommended fixes:** Define capacity budgets and redline alerts before next growth phase.
- **Confidence:** Medium-high.
- **Unknowns:** Actual production p95/p99 under current MAU/event loads.

#### Agent 4 — Graceful Degradation Audit
- **Findings:** Individual fallback mechanisms exist (offline queue, retry, health checks), but no cross-product degradation hierarchy.
- **Likely risks:** During incidents, too many features fail “equally badly” instead of preserving trust-critical core flows.
- **Root cause:** Feature-local resilience without platform-level policy.
- **Governing rules needed:** Explicit degrade order + read-only policy + UX truth statements.
- **Recommended fixes:** Add global degradation modes and per-feature fail behavior.
- **Confidence:** High.
- **Unknowns:** Current feature-flag strategy at runtime for incident response.

#### Agent 5 — Backup / Restore / Data Recovery Audit
- **Findings:** Backup strategy docs exist but self-report major unverified areas; restore drills are not evidenced as routine.
- **Likely risks:** “Backups exist” but recovery confidence is low; partial restore failure can break trust.
- **Root cause:** Documentation-first DR posture not yet exercised into operational muscle.
- **Governing rules needed:** Explicit RPO/RTO by tier, drill cadence, restore acceptance checks.
- **Recommended fixes:** Start monthly restore drills, evidence logs, and stop declaring DR-ready without drill pass.
- **Confidence:** High.
- **Unknowns:** Current backup retention/pitr settings in live project.

#### Agent 6 — Disaster Recovery / Continuity Audit
- **Findings:** DR guidance exists but lacks incident-command maturity artifacts (tested runbooks, comms timelines, role ownership matrices).
- **Likely risks:** Slow containment and stakeholder communication during live event outages.
- **Root cause:** Continuity planning not yet integrated with event-day operational needs.
- **Governing rules needed:** Outage class playbooks + communication SLA.
- **Recommended fixes:** Build outage class runbooks (database failure, provider outage, lockout), run game days.
- **Confidence:** Medium-high.
- **Unknowns:** Actual on-call roster maturity and escalation tooling.

#### Agent 7 — Reliability Observability Audit
- **Findings:** Health pages/checks exist; however, complete user-journey SLI telemetry and backup/restore telemetry are incomplete.
- **Likely risks:** Green dashboards with broken user journeys.
- **Root cause:** Component/service monitoring not tightly coupled to user-impact metrics.
- **Governing rules needed:** Core SLI dictionary + alert classes bound to customer impact.
- **Recommended fixes:** Instrument journey-level success rates and latency SLIs.
- **Confidence:** High.
- **Unknowns:** Current production dashboard and alert inventory.

#### Agent 8 — Testing / Drill / Rollout Audit
- **Findings:** E2E and service tests exist, but resilience drills (dependency outage simulation, DR drills, event stress drills) are not institutionalized.
- **Likely risks:** Incident surprises at scale and unproven rollback/containment behavior.
- **Root cause:** Test focus on feature correctness > survivability engineering.
- **Governing rules needed:** Mandatory drill matrix and release reliability gates.
- **Recommended fixes:** Add staged load/failure/restore test suites with launch thresholds.
- **Confidence:** High.
- **Unknowns:** Whether any ad hoc internal drills are occurring outside repo documentation.

---

## 2. Full Reliability System Map

### Service Tiers (proposed)
- **Tier-0 (must remain available):** auth/account access, trip read/write core object access, invites/join, billing entitlement checks, admin incident controls.
- **Tier-1 (high-value but degradable):** chat/channels (realtime may degrade to polling), tasks/polls/calendar mutations, notifications/activity feed.
- **Tier-2 (best-effort):** AI Concierge, search enrichment freshness, imports/sync acceleration, non-critical analytics/auxiliary jobs.

### Dependency Graph (high level)
1. **Client (React + PWA + Capacitor shell)**
   - depends on Supabase Auth, DB APIs, Realtime, Storage
   - optional providers: Google Maps, AI providers, Stripe/RevenueCat, push/email providers
2. **Supabase Edge Functions**
   - mediate AI, maps, billing, notifications, import/export workflows
3. **Queues/jobs**
   - notification queue, offline sync queues, scheduled broadcast/reminder jobs
4. **Data stores**
   - PostgreSQL (source of truth), object storage for media

### Sync vs Async Coupling
- **Synchronous critical path:** auth/session, trip load/mutate, entitlement verification.
- **Async path:** notifications, scheduled messages, embedding/index jobs, imports/exports, some AI enrichment.

### Queue/Job Criticality
- **Critical jobs:** notification dispatch, entitlement sync, reminder jobs with contractual/event implications.
- **Non-critical jobs:** enrichment/index freshness jobs, optional AI post-processing.

### Backup/Restore Paths
- Primary reliance on Supabase backups/PITR strategy (currently documented as needing verification and regular drill execution).

### Degradation Paths (current reality)
- Localized retries/offline queueing exist.
- No explicit whole-product degraded mode matrix is enforced consistently.

### Incident/Communication Paths
- Documentation exists but no strongly evidenced command cadence, comms SLA, and role matrix embedded as an enforced operational routine.

### Blast Radius/Cascade Points
- Supabase project-level outage = broad platform outage risk.
- Realtime saturation can degrade chat/notifications perception quickly.
- Provider outages (AI/maps/billing) can contaminate request latency if not aggressively bounded.

---

## 3. Service Tier + SLO Constitution

### Tier Definitions and Target SLOs

| Tier | Surface | Primary SLI | Target SLO | Error Budget |
|---|---|---|---|---|
| Tier-0 | Auth/account, trip read/write, invite/join, entitlement check | journey success rate + p95 latency | 99.95% monthly | 21m 54s/month |
| Tier-1 | Chat/channels, tasks/polls/calendar writes, notifications read flow | operation success + p95 latency | 99.9% monthly | 43m 49s/month |
| Tier-2 | AI concierge, search freshness, imports/enrichment | successful response or graceful fallback | 99.0% monthly | 7h 18m/month |

### Error Budget Rules
1. **<25% burned:** normal feature velocity.
2. **25–50% burned:** require reliability review for risky launches.
3. **50–100% burned:** freeze non-reliability releases for impacted tier.
4. **>100% burned:** incident review + recovery work before further launch.

### Alerting tied to user impact
- Alert on journey failure ratio for Tier-0/1 routes, not just host uptime.
- Alert on latency + saturation leading indicators before hard failure.

### Realistic commitments
- Tier-2 should advertise “best-effort with fallback,” not hard uptime promises.
- Tier-0 must have strict incident escalation and explicit owner.

---

## 4. Capacity Constitution

### Baseline assumptions (define and validate)
- Active concurrent users split across consumer trips and pro/event cohorts.
- Per-feature request rates: trip reads/writes, chat sends, invite joins, notification fanout.

### Burst assumptions (must be modeled)
- **Event spike:** 10–20x normal chat/read fanout for hot channels.
- **Join flood:** 20x invite/join operations in short windows.
- **AI burst:** 5–10x concierge calls around itinerary windows.
- **Media burst:** high parallel upload pressure on storage + metadata writes.

### Required thresholds (initial policy)
- Queue backlog redline: >10 minutes age for high-priority jobs.
- Queue critical: >30 minutes age or sustained growth for 3 intervals.
- DB saturation warning: sustained p95 query latency >300ms on Tier-0 query set.
- DB critical: p95 >800ms or connection pool >85% sustained.
- Realtime warning: subscription error/reconnect rate >3% in 5 minutes.

### Headroom policy
- Tier-0 dependencies run with at least 30% throughput headroom at p95.
- Event windows require 2x tested headroom on realtime + queues.

### Autoscale vs shed
- **Autoscale first:** stateless edge/function execution, worker concurrency.
- **Shed first:** Tier-2 AI/enrichment, non-essential notifications, heavy optional exports.

---

## 5. Graceful Degradation Constitution

### Degrade order under stress/outage
1. Tier-2 optional AI/enrichment features (disable or cache-only mode).
2. Search freshness/background indexing (serve stale index with freshness banner).
3. Non-critical notifications (batch/delay).
4. Tier-1 write-heavy operations (rate-limit, then queued acceptance with delayed consistency).
5. Tier-0 remains prioritized (auth, core trip data, invite/join, entitlement checks).

### Read-only vs writable
- Trigger global **read-only mode** for Tier-1/2 writes if DB/queue saturation crosses critical redline while preserving Tier-0 read paths.
- Keep critical Tier-0 writes available where possible via priority lanes.

### Provider failure behavior
- **AI down:** disable AI actions, keep trip/chat/tasks working; show explicit “AI temporarily unavailable.”
- **Realtime degraded:** fall back to polling with “live updates delayed” label.
- **Search stale:** serve cached/stale search with freshness timestamp.
- **Notification lag:** in-app indicators continue; push/email marked delayed.
- **Import/provider failure:** isolate importer and mark partial completion, never block core trip usage.

### UX truthfulness
- User messaging must explicitly state degraded capability and expected recovery window class (“minutes”, “hours”, “unknown”).

---

## 6. Backup + Restore Constitution

### Coverage
- PostgreSQL primary data, storage metadata mappings, critical config snapshots, and migration state must be covered.

### Frequency & retention
- Daily automated backups minimum, PITR enabled for production tier where available.
- Suggested retention: 35-day daily + 12-month monthly snapshots (final values based on compliance/plan).

### Restore granularity
- Must support full restore and selective table/object recovery workflows.

### Verification
- Monthly restore drill to staging from latest backup.
- Quarterly simulated incident restore from historical point.
- Verification checklist must include: auth access, trip integrity, member roles, chat continuity, entitlements, invite join flow.

### RPO/RTO targets (initial)
- Tier-0: RPO ≤ 15 minutes (with PITR), RTO ≤ 2 hours.
- Tier-1: RPO ≤ 1 hour, RTO ≤ 4 hours.
- Tier-2: RPO ≤ 24 hours, RTO ≤ 24 hours.

### Restore sequence (priority)
1. Identity/auth + core trip entities.
2. Membership/roles and entitlements.
3. Chat/tasks/calendar core tables.
4. Notifications/search/indexes/derived artifacts.
5. Optional AI/history artifacts.

### Recovery declaration criteria
- Recovery is declared only after objective post-restore checks pass for critical journeys and integrity samples.

---

## 7. Disaster Recovery Constitution

### Outage classes
1. Dependency degradation (single provider latency/outage).
2. Data-plane failure (DB/storage severe impairment).
3. Control-plane/project lockout or region-level outage.
4. Application deployment/regression induced outage.

### Playbooks required
- **Provider outage playbook:** isolate provider, trigger fallback mode, enforce timeouts/circuit behavior.
- **DB failure playbook:** halt risky writes, execute restore or forward-recovery, validate Tier-0 first.
- **Project lockout playbook:** break-glass credentials, emergency communication, secondary access path.

### Failover/forward recovery rules
- Prefer forward recovery for code-level defects.
- Use restore/failover only when data integrity is at risk or service unavailable beyond threshold.

### Live-event continuity expectations
- Event-day run mode requires heightened SRE staffing, tighter alert thresholds, and pre-warmed capacity margin.

### Communication expectations
- First status update within 10 minutes of major incident declaration.
- Customer-facing updates every 30 minutes (or faster on event/pro incidents).

---

## 8. Observability + Alerting Constitution

### Core SLIs
- Journey success rates: login, trip open, trip write, chat send/receive, invite join, payment entitlement confirmation.
- Latency SLIs per tier (p50/p95/p99).
- Error rate SLIs by endpoint/function/provider.

### Saturation/backlog metrics
- DB query latency and connection utilization.
- Queue depth, queue age, retry rates, dead-letter counts.
- Realtime subscribe error/reconnect rates and fanout lag.

### Dependency health metrics
- AI/maps/billing/email/push provider availability + timeout/failure rates.

### Synthetic checks
- User-journey probes (auth→trip read→chat send) from at least two regions.
- Invite/join and entitlement check synthetic validations.

### Degradation-state visibility
- Every degradation mode must emit machine-readable state and be visible on ops dashboards.

### Restore health visibility
- Backup success age, restore drill status, and last validated RPO/RTO published in dashboard.

### Alert classes
- **P1:** Tier-0 journey failure or DB critical saturation.
- **P2:** Tier-1 widespread impact or sustained queue critical state.
- **P3:** Tier-2/provider degradation with fallback functioning.

### Escalation ownership
- Named incident commander, comms lead, and on-call owner rotation required per period.

---

## 9. Performance + Scale Stage Plan

### Stage A: baseline startup reliability discipline
- **Bottlenecks:** undefined SLOs, missing user-impact alerts, unproven restore drills.
- **SLO/capacity requirements:** establish tier/SLO/error budgets; publish baseline traffic assumptions.
- **Backup/restore requirements:** verify automated backup + PITR settings; run first restore drill.
- **Degradation requirements:** define and ship degradation modes table.
- **Drill/test requirements:** first game day (provider outage + queue backlog simulation).
- **Unsafe without redesign?** No redesign yet, but unsafe to scale without policy enforcement.

### Stage B: moderate growth and more dependency complexity
- **Bottlenecks:** provider coupling, queue backlog fragility, realtime fanout limits.
- **SLO/capacity requirements:** per-surface latency budgets, queue SLOs.
- **Backup/restore requirements:** monthly drill cadence and evidence logs.
- **Degradation requirements:** automated feature-flag kill-switches for Tier-2.
- **Drill/test requirements:** recurring failure injection in staging.
- **Unsafe without redesign?** Hot channels may require partitioning strategy.

### Stage C: higher event/pro stakes and burstier traffic
- **Bottlenecks:** event-day spikes, notification fanout, concurrent media + chat bursts.
- **SLO/capacity requirements:** event-mode capacity with 2x tested headroom.
- **Backup/restore requirements:** RTO <2h validated with timed drills.
- **Degradation requirements:** strict write-priority lanes and deterministic shedding order.
- **Drill/test requirements:** event-day chaos drills and comms exercises.
- **Unsafe without redesign?** If hot-trip isolation absent, global blast radius remains high.

### Stage D: mature reliability posture with real continuity confidence
- **Bottlenecks:** multi-provider orchestration and governance complexity.
- **SLO/capacity requirements:** hardened multi-region/multi-provider strategy as needed.
- **Backup/restore requirements:** audited quarterly DR certification.
- **Degradation requirements:** policy-as-code for automatic reliability controls.
- **Drill/test requirements:** full-scale game days including lockout and restore scenarios.
- **Unsafe without redesign?** Continuing single-region/single-control-plane dependence may become unacceptable for enterprise-grade commitments.

---

## 10. Dangerous Failure Modes

| Failure Mode | Severity | Likelihood | Blast Radius | Root Cause | Recommended Fix | Timing |
|---|---|---|---|---|---|---|
| No explicit SLO/error budgets | Critical | High | Org-wide | No tier constitution | Define tier SLOs + burn rules | Immediate |
| Hot event saturates realtime/queues | Critical | Medium-High | Trip-to-platform | No burst guardrails/headroom policy | Set capacity envelopes + queue redlines + shedding | Immediate + staged |
| Provider outage breaks too much app | High | Medium | Cross-feature | Weak optional dependency boundaries | Kill-switch + timeout + fallback matrix | Immediate |
| Backups exist but restore unproven | Critical | High | Data trust/systemic | Drill gap | Monthly restore drills + acceptance checks | Immediate |
| Partial restore corrupts trust | Critical | Medium | Tier-0 data confidence | No object-level validation | Post-restore integrity suite | Immediate |
| Degradation path undefined | High | High | User trust + incident response | Missing policy | Explicit degrade order + UX states | Immediate |
| Queue backlog grows silently | High | Medium-High | Notifications/imports/chat side effects | Missing backlog SLOs/alerts | Queue age/depth alerts + throttling | Immediate |
| AI outage blocks core usage | Medium-High | Medium | UX across trips | Tiering not enforced | Isolate AI as Tier-2 with fallback UX | Immediate |
| Incident command/comms too slow | High | Medium | Pro/event customers | Runbook/comms cadence gap | Incident roles + comms SLA drills | Immediate + staged |

---

## 11. Recommended Immediate Fixes

1. Ratify and publish Tier-0/1/2 service criticality matrix.
2. Define SLIs/SLOs and burn-rate alerts for Tier-0 and Tier-1 journeys.
3. Add queue age/depth dashboards + alerts for critical job pipelines.
4. Implement explicit degradation flags and product-level messaging templates.
5. Run first full restore drill to staging with timed RPO/RTO capture.
6. Add provider dependency matrix with mandatory timeout/circuit/fallback policy.
7. Add synthetic journey monitors for auth→trip open→chat send and invite→join.
8. Create incident command playbook with 10-minute first update SLA.

---

## 12. Exact Code / Schema / Infra Changes

### Files/modules/configs to modify (recommended)
- `docs/`:
  - add `docs/reliability/slo-tier-policy.md`
  - add `docs/reliability/degradation-modes.md`
  - add `docs/reliability/dr-runbook.md`
- `src/`:
  - `src/services/apiHealthCheck.ts` → emit structured metrics and degrade state events.
  - `src/pages/Healthz.tsx` + `supabase/functions/health/index.ts` → include queue lag + dependency status metadata.
  - Add `src/lib/reliability/degradationFlags.ts` (single source for incident mode switches).
- `supabase/functions/_shared/`:
  - standard timeout wrapper + circuit-breaker contract enforcement + provider fallback helpers.
- `supabase/migrations/`:
  - add operational tables for reliability events (optional staged): `incident_states`, `degradation_events`, `restore_drill_log`.

### Queue/worker/config changes
- Add priority lanes (Tier-0/1 high priority vs Tier-2 best effort).
- Enforce max retry budgets and dead-letter visibility.

### Alert/dashboard additions
- SLI dashboards for login, trip read/write, chat send/receive.
- Saturation dashboards: DB p95/p99, queue age/depth, realtime reconnect rate.

### Backup/restore and retention changes
- Verify automated backup + PITR in production project.
- Implement monthly restore drill with evidence artifact upload.

### Degradation/feature flags
- Introduce kill switches per optional dependency (AI/maps/importers).
- Add read-only mode toggle for controlled protection during severe saturation.

### Load-shedding additions
- Request admission control on Tier-2 APIs first.
- Rate limits for event storms (chat send + invite/join bursts).

### Drill/runbook additions
- Quarterly game days: provider outage, queue backlog, DB restore, event-day comms.

### Deployment order
1. Observability + SLIs first.
2. Degradation controls second.
3. Queue safeguards third.
4. Restore drills and DR runbooks fourth.

### Rollback plan
- Any hardening release must be feature-flagged; revert via flag disable or `git revert <sha>` with preserved runbook state.

---

## 13. Verification Plan

### SLI validation
- Validate telemetry correctness against synthetic journey probes.

### Capacity/load tests
- Event spike load test (chat/read/join burst).
- Queue growth tests with worker saturation.

### Provider outage simulations
- AI outage, maps timeout, billing webhook delays.

### Degradation-mode tests
- Verify read-only mode semantics and user messaging.

### Queue backlog simulations
- Force queue lag and verify P2/P1 alerting + shedding behavior.

### Backup restore drills
- Monthly staging restore from latest backup.
- Quarterly historical point restore.

### RPO/RTO drills
- Time-box drill with target RPO/RTO capture and pass/fail gate.

### Event-day stress drills
- Simulated live event traffic with communication drill.

### Alert/escalation validation
- Test alerts route to on-call with ack/escalation timing requirements.

### Local repro steps
1. Run app (`npm run dev`) and invoke health checks.
2. Simulate provider failures via env toggles/mocks.

### Staging repro steps
1. Replay synthetic journeys under nominal/degraded conditions.
2. Run queue saturation and fallback tests.

### Launch thresholds
- No launch if Tier-0 SLI < SLO in trailing 7-day canary window.
- No launch if latest restore drill failed.

### Rollback/containment triggers
- Trigger rollback/containment when Tier-0 error budget burn >10% in 1 hour or P1 sustained >10 minutes.

---

## 14. Post-Fix Scorecard

| Domain | Score (1-100) | Why not 95+ yet |
|---|---:|---|
| Service-tier clarity | 62 | Tiering currently not ratified in enforceable policy artifacts. |
| SLO/SLI maturity | 55 | Journey SLIs and error-budget governance not institutionalized. |
| Capacity planning maturity | 58 | No explicit tested burst/headroom envelopes in repo policy. |
| Graceful degradation quality | 60 | Local fallbacks exist, but no explicit global degrade ordering. |
| Backup/restore trustworthiness | 48 | Backup docs exist, but restore drills are not evidenced as routine. |
| Disaster recovery readiness | 50 | DR guidance present but playbook/testing cadence remains immature. |
| Observability/alerting | 57 | Health checks exist, but user-impact telemetry and alert mapping incomplete. |
| Production resilience | 56 | Foundations present; survivability posture not yet operationally proven. |

**Interpretation:** Current state remains **below 70 in multiple critical areas**, which is **fragile/unsafe** for high-stakes production dependence until staged hardening is executed.
