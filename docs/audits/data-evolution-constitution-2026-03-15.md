## 1. Executive Summary
The current data layer is **functionally rich but structurally fragmented**. Core trip collaboration objects exist, but canonical truth is split across legacy and newer tables/functions, with repeated table rewrites over time (e.g., `trip_members`, `trip_chat_messages`, `notifications`, `profiles`). Migration history shows high churn with overlapping concerns (security + feature + cleanup in single migrations) and weak release-coupling discipline. 

Top risks:
- **Canonical-truth fragmentation:** overlapping representations for trip access, membership, channels, and search/index derivatives.
- **Migration risk:** 308 migrations, many touching the same tables, non-uniform naming and mixed-purpose files; no evidence of a strict expand/contract compatibility constitution.
- **Backfill/job risk:** several recompute jobs are callable and high-impact but lack hardened pause/resume/runbook conventions.
- **Retention/deletion risk:** account deletion currently models a request state but no durable demonstrated execution pipeline for final deletion.
- **Scale/performance risk:** frequent high-write entities (chat, notifications, read receipts, location, embeddings) are present, but migration/index rollout safety (e.g., no `CONCURRENTLY`) and archive partitioning policy are not formalized.

Architecture is **salvageable with staged hardening**, but only if Chravel adopts a formal data constitution (ownership, migration protocol, backfill protocol, lifecycle semantics, downstream contracts) and enforces it in CI + release gates.

## 2. Full Data Evolution System Map
### Core entity families (observed)
- Identity/accounts: `profiles`, auth user linkage, account deletion RPCs.
- Trip core: `trips`, `trip_members`, role/access adjuncts (`trip_roles`, `channel_role_access`, `trip_admins`).
- Collaboration: `trip_channels`, `trip_chat_messages`, `message_read_receipts`, reactions, broadcasts.
- Planning objects: `trip_tasks`, `trip_polls`, `trip_events`, `trip_links`, `trip_files`, `trip_receipts`, media indexes.
- Notifications: `notifications`, `notification_preferences`, delivery/refinement tables.
- AI/search: `kb_documents`, `kb_chunks`, `trip_embeddings`, `trip_artifacts`, search index tables.
- Monetization/entitlements: payment split and wallet-related tables, organization billing surfaces.

### Canonical state boundaries (current reality)
- Trip membership/access truth appears distributed across `trip_members`, `trip_admins`, roles, and policy logic.
- Chat truth centered in `trip_chat_messages` with increasingly structured system-message columns and policy overlays.
- Notification truth split between source event triggers and downstream delivery tables.
- Search/AI truth is mostly **derived**, but contracts between canonical write models and derived tables are not versioned.

### Migration paths
- 308 SQL migrations in `supabase/migrations` with mixed naming styles and significant table churn.
- Same high-value tables altered repeatedly (`profiles`, `trips`, `trip_join_requests`, `trip_chat_messages`, `notifications`).
- Limited visible separation between: schema DDL, data backfill, security policy updates, and bug cleanup.

### Backfill/recompute paths
- SQL cleanup migrations (e.g., orphan fixes).
- Edge functions for regeneration/reindex population (embeddings/search).
- Trigger-driven recomputation for selected features.

### Deletion/archival paths
- Soft-delete patterns (`is_deleted`, `deleted_at`) and archive flags (`is_archived`, `archived_at`) coexist across domains.
- Trip archival semantics exist for trip persistence after creator/member changes.
- Account deletion request flow exists; irreversible purge pipeline not clearly codified in repo-level operational artifacts.

### Downstream consumer dependencies
- Search/index tables and populate functions.
- AI retrieval stores (chunks/embeddings/artifacts).
- Notification delivery functions and refinements.
- Export flows and data packaging functions.

### Integrity constraint layers
- RLS-heavy architecture with many policy migrations.
- Foreign keys present but inconsistent coverage in history (some fixed later after orphan incidents).
- Uniqueness constraints exist selectively; idempotency keys recently introduced to only some object families.

### Likely drift/corruption/blast-radius points
- Membership/authorization model changes affecting channels/chat/polls/tasks simultaneously.
- Trigger behavior changes with bulk imports and notification fanout.
- Derived stores (search/embeddings/artifacts) drifting from canonical writes without reconciliation cadence.
- Orphan risk in any table where FK was added post-hoc and historical data already existed.

## 3. Data Model Constitution
1. **Canonical ownership by object family**
   - Identity: `auth.users` + `profiles` (public profile and product metadata).
   - Trip membership and access: `trip_members` as canonical membership state; admin/role abstractions must derive from or reference it.
   - Trip content objects (tasks/polls/events/links/files/chat/media): canonical rows stay in first-order domain tables.
   - Derived/index/AI state (search, embeddings, chunks, artifacts): never canonical; always recomputable.

2. **No split-brain canonical state**
   - A feature may not write canonical truth to one table and authorization truth to a second unless an explicit ownership contract exists.
   - Every object family must publish: canonical table(s), derived table(s), and owning write-path (RPC/function/service).

3. **Trip / Pro / Event modeling rule**
   - Keep one core `trips` supertype with strict `trip_type` discriminant.
   - Variant-specific fields must live in subtype extension tables keyed by `trip_id` (1:1), not sparsely null columns everywhere.

4. **Status/enum modeling rule**
   - Every mutable lifecycle field must have a documented state machine (allowed transitions + actor).
   - Enum additions require compatibility window and downstream contract update.

5. **Denormalization policy**
   - Allowed only for read paths where recompute exists and drift checks are automated.
   - Denormalized fields require: source-of-truth pointer, recompute job, and drift metric.

6. **Schema complexity boundary**
   - Acceptable: single-purpose table + explicit FK + clear RLS.
   - Rot signal: repeated policy rewrites, nullable catch-all columns, multiple parallel access tables for same concept.

## 4. Migration Constitution
1. **Expand/Contract mandatory**
   - Phase 1 (expand): add nullable columns/new tables/policies compatible with old app.
   - Phase 2 (dual-read/write): app code supports both.
   - Phase 3 (contract): remove old paths only after telemetry verifies full cutover.

2. **Migration scope isolation**
   - Separate files for: schema DDL, data migration/backfill, policy changes, index changes.
   - No mixed-purpose mega-migrations for high-risk entities.

3. **Destructive change policy**
   - `DROP TABLE/COLUMN`, broad `DELETE`, and irreversible transforms require explicit signed rollback/forward-fix runbook.
   - For large tables, destructive steps require dry-run cardinality check + staged execution.

4. **Nullable-to-required policy**
   - Add column nullable → backfill → add CHECK NOT VALID / validate → enforce NOT NULL.

5. **Enum/status evolution policy**
   - Add values first.
   - Deploy app compatibility.
   - Backfill/remap legacy values.
   - Enforce stricter constraints only after read/write parity verified.

6. **Safety proof before apply**
   - Must pass migration replay from clean DB.
   - Must pass old-app/new-schema and new-app/old-schema compatibility window tests.

## 5. Backfill + Recompute Constitution
1. **Backfills are first-class releases** with owner, SLO, kill-switch, metrics.
2. **Idempotency required** via deterministic keys/upsert constraints where possible.
3. **Batching standard**
   - Start with small chunk size (100–500 rows logical unit), tune by lock + latency telemetry.
   - Sleep/throttle between chunks for write-heavy tables.
4. **Pause/resume required**
   - Persist cursor/checkpoint and last successful primary key or timestamp.
5. **Retry policy**
   - Exponential backoff + dead-letter capture for non-transient failures.
6. **Observability requirement**
   - Progress %, rows scanned/updated, retries, failures, lock wait time, DB CPU impact.
7. **Reconciliation requirement**
   - Pre/post counts and invariant checks (duplicates, orphans, null drift).
8. **Completion definition**
   - Backfill complete only when data checks pass and drift monitor stays stable for defined observation window.

## 6. Retention / Deletion / Archival Constitution
1. **Soft delete semantics**
   - `deleted_at` marks record hidden from all end-user read paths except explicit admin/audit views.
   - Soft-deleted rows remain referentially valid for retention window.

2. **Hard delete semantics**
   - Executed by controlled job/RPC only after retention prerequisites.
   - Must guarantee cascading cleanup (DB FK + storage object cleanup + derived index cleanup).

3. **Tombstone policy**
   - For user-visible threads/activity, replace hard-deleted content with tombstones when conversation/history integrity matters.

4. **Account deletion policy**
   - Two-phase: request/schedule + executor purge.
   - Purge contract must declare which data is erased, anonymized, retained for fraud/audit, and for how long.

5. **Trip/event archival policy**
   - `is_archived`/`archived_at` must exclude rows from hot queries by default.
   - Archived objects move to cold-read indexes/partitions once volume thresholds are crossed.

6. **Media cleanup policy**
   - Any DB delete/archive affecting media must enqueue storage deletion verification and orphan sweep.

7. **Orphan cleanup policy**
   - Scheduled orphan detectors for every non-cascading relationship family.

## 7. Integrity Constraint Constitution
1. **Uniqueness**
   - Enforce natural uniqueness for membership, idempotency keys, reaction-per-user-per-message, invite uniqueness, etc.
2. **FK expectations**
   - Canonical relationships must be DB-enforced unless cross-boundary (auth/storage) prevents direct FK; then enforce via durable validator job.
3. **Nullability**
   - Null means unknown/unset only; not a proxy for status.
4. **Derived-field rules**
   - Derived columns must be recomputable and never sole source for business-critical decisions.
5. **Dedupe/merge rules**
   - Define conflict key and deterministic winner; log merge actions for auditability.
6. **DB vs app invariants**
   - Load-bearing invariants (ownership, uniqueness, lifecycle transitions) enforced at DB layer + RLS.
7. **RLS coexistence**
   - RLS restricts visibility; constraints enforce truth. One does not replace the other.

## 8. Downstream Data Contract Constitution
1. **Contracted producers/consumers**
   - Search/index, analytics, notifications, AI retrieval, export all consume canonical trip objects via explicit projection contracts.
2. **Versioning**
   - Any schema shape consumed downstream must carry contract version and deprecation window.
3. **Compatibility**
   - Additive changes first; breaking changes require dual-write/read period.
4. **Drift detection**
   - Nightly reconciliation between canonical objects and downstream projections.
5. **Failure semantics**
   - Downstream lag must be observable and user-facing features must degrade safely (stale indicators, retry path).

## 9. Performance + Scale Stage Plan
### Stage A: current startup data footprint
- Bottlenecks: migration sprawl, ambiguous ownership, ad hoc jobs.
- Requirements: constitution adoption, migration linting, invariant tests, top-table index audit.
- Unsafe without redesign: continuing mixed-purpose migrations.

### Stage B: moderate collaboration and growth
- Bottlenecks: chat/notification write amplification, policy complexity.
- Requirements: write-path idempotency across all object families, pagination/index tuning, derived-data reconciliation jobs.
- Unsafe without redesign: app-only invariants and no job checkpointing.

### Stage C: heavier event/pro and larger history
- Bottlenecks: large trip histories, notification fanout, embedding/search growth.
- Requirements: archive partition strategy, queue-based fanout, controlled recompute windows, hot/cold query split.
- Unsafe without redesign: full-table backfills during peak traffic.

### Stage D: mature production with archival pressure
- Bottlenecks: index bloat, long-tail retention cost, cross-system drift.
- Requirements: partitioned historical tables, lifecycle automation, strict downstream contract registry, release drills.
- Unsafe without redesign: no formal retention executor and no storage/object reconciliation.

## 10. Dangerous Failure Modes
1. Canonical state split across membership/access tables — **Severity: Critical / Likelihood: High / Blast: cross-feature auth bugs**. Fix immediate: declare single canonical membership table and refactor policies to derive from it.
2. Destructive migration outage — **Critical / Medium / High blast**. Fix staged: destructive-gate process + preflight checks.
3. Backfill overload/corruption — **High / Medium / High blast**. Fix immediate: standardized job framework with checkpoint + throttle + reconciliation.
4. Soft-deleted data treated as live — **High / Medium / Medium blast**. Fix immediate: mandatory default scopes excluding soft-deleted rows.
5. Hard delete orphan leakage — **High / Medium / High blast**. Fix immediate: FK coverage audit + orphan sweeper.
6. Archived data polluting hot paths — **Medium / High / Medium blast**. Fix staged: archive-aware indexes and query contracts.
7. Schema change breaks AI/search/analytics silently — **High / Medium / High blast**. Fix immediate: downstream contract versioning and drift monitors.
8. Weak uniqueness causes duplicates — **High / Medium / Medium blast**. Fix immediate: expand idempotency + unique constraints.
9. Enum/status evolution breaks older clients — **Medium / Medium / Medium blast**. Fix staged: compatibility window tests.
10. Account deletion conflicts with retention/audit — **High / Medium / High blast**. Fix immediate: explicit legal/data-class retention matrix + executor.
11. Event-scale growth degrades indexes — **High / Medium / High blast**. Fix staged: partition thresholds and index lifecycle management.
12. No realistic rollback after data rewrite — **Critical / Medium / High blast**. Fix immediate: forward-fix runbooks and reversible staging protocol.

## 11. Recommended Immediate Fixes
1. Publish canonical ownership matrix for all object families (trip, membership, chat, notifications, AI/search).
2. Introduce migration governance:
   - one concern per migration,
   - expand/contract checklist,
   - mandatory compatibility tests.
3. Build standardized backfill runner with checkpointing, throttling, idempotency envelope, telemetry.
4. Formalize deletion/retention matrix (user, trip, media, notifications, audit logs, AI artifacts).
5. Complete FK/unique/idempotency constraint audit for high-write tables.
6. Add downstream contract registry + versioned projections for search/AI/analytics/notifications.
7. Add drift dashboards: orphan counts, duplicate anomalies, derived parity lag, archive exclusion errors.

## 12. Exact Code / Schema / Infra Changes
1. **Schema/process**
   - Add `docs/data-constitution.md` (canonical ownership + lifecycle matrix).
   - Add migration template + CI migration linter (naming, destructive checks, mixed-scope detection).
2. **Migrations**
   - Create staged hardening migrations for:
     - missing FK/unique constraints on hot tables,
     - standardized soft-delete indexes (`WHERE deleted_at IS NULL`),
     - archive indexes (`WHERE is_archived = false`).
3. **Backfill tooling**
   - Add shared edge job utility for checkpoint/pause/resume and metrics emission.
4. **Archival/cleanup jobs**
   - Add account deletion executor job with dry-run mode.
   - Add media orphan reconciler (DB rows ↔ storage objects).
5. **Downstream contracts**
   - Add projection version field(s) and compatibility flags for search/AI pipelines.
6. **Telemetry**
   - Emit migration runtime + lock metrics, backfill progress metrics, drift counters.
7. **Deploy order**
   - Docs/constitution → migration lint CI → non-breaking schema adds → app dual-read/write → backfill → contract cleanup.
8. **Rollback/forward-fix**
   - Prefer forward-fix for data mutations; rollback only for additive schema before writes begin.

## 13. Verification Plan
1. Schema integrity tests: uniqueness/FK/null/default checks for critical families.
2. Migration compatibility tests:
   - replay all migrations on empty DB,
   - old-app/new-schema and new-app/old-schema contract tests.
3. Backfill tests: idempotency, pause/resume, partial failure recovery, reconciliation assertions.
4. Retention/delete/archive tests:
   - account deletion lifecycle,
   - archive exclusion from hot queries,
   - storage cleanup verification.
5. Orphan/duplicate detection tests: scheduled SQL checks with threshold alerts.
6. Downstream contract tests: projection version compatibility for AI/search/analytics/notifications/export.
7. Performance tests: synthetic data growth for chat, notifications, embeddings, event-scale trips.
8. Rollback/forward-fix drills: staging game days before production release windows.

## 14. Post-Fix Scorecard
Current-reality scoring (not target):
- Data-model coherence: **72/100 (fragile)**
- Canonical-truth clarity: **68/100 (unsafe)**
- Migration safety: **64/100 (unsafe)**
- Backfill safety: **66/100 (unsafe)**
- Retention/deletion/archival coherence: **61/100 (unsafe)**
- Integrity constraints: **74/100 (fragile)**
- Downstream contract stability: **63/100 (unsafe)**
- Observability: **69/100 (unsafe)**
- Production readiness for next complexity tier: **70/100 (fragile)**

Why below 95:
- Canonical ownership and lifecycle semantics are not yet codified and enforced.
- Migration/backfill operations lack a strict reliability framework and compatibility gates.
- Downstream derived systems do not yet have explicit, versioned contracts with drift alarms.

---

## Required Parallel Sub-Agent Delegation (Audit Outputs)
### Agent 1 — Entity Model + Canonical Truth Audit
- Findings: membership/access and trip variant semantics are distributed across multiple tables and policy layers.
- Risks: split-brain authorization and inconsistent query assumptions.
- Root causes: iterative feature growth without hard ownership matrix.
- Governing rules: single canonical owner per object family + strict subtype modeling.
- Recommended fixes: canonical ownership registry; enforce membership derivation from one source.
- Confidence: Medium-High.
- Unknowns: live production data quality and undocumented side-channel writes.

### Agent 2 — Migration Safety Audit
- Findings: migration corpus is large and non-uniform; repeated touchpoints on critical tables.
- Risks: rollout incompatibility, accidental breakage during mixed deploy windows.
- Root causes: no enforced expand/contract and mixed-scope migrations.
- Governing rules: compatibility windows + one-concern migration files.
- Recommended fixes: CI migration linter + destructive gate and staged contracts.
- Confidence: High.
- Unknowns: staging/prod release sequencing discipline outside repo.

### Agent 3 — Backfill / Recompute / Data Job Audit
- Findings: recompute jobs exist, but checkpoint/kill-switch conventions are not universalized.
- Risks: partial completion, hidden drift, load spikes.
- Root causes: job-by-job implementation variance.
- Governing rules: mandatory idempotency, checkpoints, reconciliation proof.
- Recommended fixes: shared backfill framework and telemetry schema.
- Confidence: Medium.
- Unknowns: runtime concurrency limits and job orchestration setup.

### Agent 4 — Retention / Deletion / Archival Audit
- Findings: mixed soft-delete/archive conventions; account deletion request path present, executor semantics unclear.
- Risks: legal/compliance drift, ghost data, inconsistent user experience.
- Root causes: lifecycle policy encoded in feature slices, not unified matrix.
- Governing rules: explicit lifecycle classes and user/operator visibility rules.
- Recommended fixes: retention matrix + deletion executor + media reconciliation.
- Confidence: Medium.
- Unknowns: legal retention requirements per region/product tier.

### Agent 5 — Integrity Constraints + Relationship Audit
- Findings: integrity improved over time but historical orphan fixes indicate delayed FK application in places.
- Risks: duplicate/orphan rows and repair migrations under pressure.
- Root causes: incremental schema evolution with late constraint hardening.
- Governing rules: DB constraints for load-bearing invariants.
- Recommended fixes: full FK/unique audit and constraint backlog burn-down.
- Confidence: Medium-High.
- Unknowns: exact FK coverage in current production versus local schema.

### Agent 6 — Performance / Index / Growth Audit
- Findings: heavy index usage and high-write domains present; operational index strategy not yet staged by growth tier.
- Risks: write amplification, index bloat, lock-heavy schema changes.
- Root causes: feature-driven indexing without lifecycle/partition policy.
- Governing rules: hot-path index budgets and archive partition thresholds.
- Recommended fixes: stage-based index/partition roadmap; avoid blocking index creation on large tables.
- Confidence: Medium.
- Unknowns: true table cardinalities and workload distribution.

### Agent 7 — Downstream Consumer Audit
- Findings: search/AI/notification derived stores exist with evolving schemas, but formal contract versioning is limited.
- Risks: silent downstream breakage on schema evolution.
- Root causes: derived pipelines not treated as versioned APIs.
- Governing rules: projection contracts, deprecation windows, drift monitors.
- Recommended fixes: versioned projection schemas and consumer compatibility tests.
- Confidence: Medium.
- Unknowns: all external consumers and SLAs.

### Agent 8 — Observability / Testing / Release Coupling Audit
- Findings: substantial security/test artifacts exist, but migration/backfill/lifecycle observability is not centralized.
- Risks: drift detection lags incidents; forward-fix decisions under uncertainty.
- Root causes: no single data-ops telemetry framework.
- Governing rules: release gates must include data integrity and drift metrics.
- Recommended fixes: migration/backfill dashboards, orphan/duplicate alerting, rollback-forward-fix drills.
- Confidence: Medium.
- Unknowns: production alert thresholds and on-call runbooks.
