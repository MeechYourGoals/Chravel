## 1. Executive Summary

- **Current state:** The integration/import/export/sync architecture is **fragmented**. There are multiple ingestion paths (Gmail worker, generic AI file parser, calendar parser utilities, share-extension intake, chat parser) with inconsistent lifecycle semantics and no single platform-level sync contract. The codebase has pieces of integrity controls (Gmail dedupe keys, webhook idempotency table, RLS on import tables), but they are provider-specific and not unified.
- **Biggest source-of-truth risks:**
  - `trip_events` can be written both by client services and by `calendar-sync` edge function without an explicit ownership model for external IDs and conflict arbitration.
  - Imported objects are often materialized directly into core tables (e.g., `trip_receipts`, `trip_links`, `trip_chat_messages`) without a canonical “provenance + confidence + confirmation” state machine.
- **Biggest import correctness risks:**
  - Generic `SmartImport` UI still posts mixed payloads to `file-ai-parser` while that function expects JSON `{ fileId, fileUrl, extractionType }`, indicating contract drift and potential false-success UX paths.
  - AI parsing endpoints store outputs with a static confidence baseline and no durable per-field confidence or confirmation requirement before becoming shared truth.
- **Biggest sync drift/replay/reconciliation risks:**
  - Stripe has idempotency (`webhook_events`), but Gmail/calendar/share-extension pipelines lack a unified event ledger/replay discipline.
  - No system-level reconciliation job framework for provider-vs-Chravel drift; most flows are opportunistic and request-driven.
- **Biggest export/privacy risks:**
  - `export-user-data` loops many tables and “skip silently on error,” risking partial exports that may still look successful.
  - Snapshot freshness and completeness are not consistently surfaced in UX across trip export, ICS export, and GDPR export.
- **Salvageability:** **Yes**, with staged hardening. Existing primitives (RLS, job tables, dedupe keys, status enums) are usable foundations, but the current model is not safe for broad two-way sync promises without platform-level contracts.

## 2. Full External Systems Map

### Parallel Sub-Agent Delegation Findings

#### Agent 1 — Provider Model + Source-of-Truth Audit
- **Findings:** Providers include Google OAuth/Gmail (`gmail-auth`, `gmail-import-worker`), Stripe (`stripe-webhook`), Google Maps link enrichment in app logic, and AI providers through shared Gemini adapters (`file-ai-parser`, `enhanced-ai-parser`, `receipt-parser`).
- **Likely risks:** Provider-specific logic is spread across UI hooks, services, edge functions, and migrations instead of one integration boundary.
- **Root causes:** No central integration registry or provider contract interface.
- **Governing rules needed:** Integration contract per provider/object family; mandatory provenance metadata.
- **Recommended fixes:** Introduce unified integration domain model (`provider_account`, `external_object`, `sync_cursor`, `sync_conflict`).
- **Confidence:** High.
- **Unknowns:** Whether all provider tokens are rotated/revoked uniformly beyond Gmail and Stripe.

#### Agent 2 — Import Pipeline Audit
- **Findings:** Import paths include Gmail scan job/candidates, calendar file+URL+paste import, generic AI file parser, agenda/lineup parser paths, and share-extension ingestion into `shared_inbound_items` then materialization.
- **Likely risks:** Mixed schemas and completion semantics; partial successes can be interpreted as complete.
- **Root causes:** No universal import job state machine with child-step status.
- **Governing rules needed:** Canonical import stages + explicit terminal statuses (`completed_full`, `completed_partial`, `failed_recoverable`, `failed_fatal`).
- **Recommended fixes:** Introduce `integration_import_runs` and step records with idempotency key + provenance.
- **Confidence:** High.
- **Unknowns:** Production prevalence of parser contract mismatches.

#### Agent 3 — Export Pipeline Audit
- **Findings:** Trip PDF export (`export-trip`), ICS export client-side, GDPR export (`export-user-data`) with signed URL generation.
- **Likely risks:** Silent data omission and stale snapshot ambiguity.
- **Root causes:** Export completeness checks are optional/non-blocking; no per-export manifest signed with row counts by object family.
- **Governing rules needed:** Export manifests, auth scope assertions, and explicit staleness watermark.
- **Recommended fixes:** Add manifest+checksum+completeness status to every export artifact.
- **Confidence:** Medium-high.
- **Unknowns:** Admin/report exports outside these surfaced files.

#### Agent 4 — Sync + Webhook/Polling Audit
- **Findings:** Stripe webhook idempotency exists; calendar sync endpoint is action-based CRUD without provider event versioning; Gmail import is pull-scan not real webhook sync.
- **Likely risks:** replay/out-of-order handling inconsistent across integrations.
- **Root causes:** sync implementation evolved per feature, not via shared event processing substrate.
- **Governing rules needed:** event ledger + monotonic provider cursor/version contract.
- **Recommended fixes:** normalized sync event ingestion table with `(provider, account_id, object_type, external_event_id)` unique key and sequence policy.
- **Confidence:** High.
- **Unknowns:** Background job scheduler topology for retries/reconciliation.

#### Agent 5 — Reconciliation + Drift Audit
- **Findings:** Dedupe exists in Gmail candidate creation and share-extension short-window dedupe, but there is no generalized drift report, conflict queue, or operator replay tool.
- **Likely risks:** stale/missing external state remains undetected.
- **Root causes:** lack of periodic reconciliation primitives and dashboards.
- **Governing rules needed:** periodic drift scans and explainable state transitions.
- **Recommended fixes:** reconciliation jobs + operator actions (`re-fetch`, `replay`, `mark_superseded`, `merge`).
- **Confidence:** Medium-high.
- **Unknowns:** any hidden ops tooling outside repo.

#### Agent 6 — Permissions + Privacy Audit
- **Findings:** Strong RLS presence on integration tables; Gmail safe view hardened with `security_invoker=true`; export-user-data redacts by key matching and returns media signed URLs.
- **Likely risks:** scoping leaks via mixed user-private import becoming trip-shared without explicit confirmation boundary.
- **Root causes:** import materialization often bypasses policy layer with direct inserts from UI/service code.
- **Governing rules needed:** “private staging then explicit publish” for all imported content.
- **Recommended fixes:** enforce publish step + actor audit.
- **Confidence:** High.
- **Unknowns:** legal retention policy implementation for third-party imported artifacts.

#### Agent 7 — UX + Product Truth Audit
- **Findings:** UX shows success toasts and review flows in some paths (Gmail review, calendar duplicate previews), but not all paths distinguish inferred vs confirmed.
- **Likely risks:** users assume confirmations are exact/fully synced when data may be inferred or partial.
- **Root causes:** no global truth-label taxonomy in UI model.
- **Governing rules needed:** every imported/synced object carries `truth_label` shown in UI.
- **Recommended fixes:** add badges and filters: Confirmed/Imported-Inferred/Needs Review/Stale.
- **Confidence:** Medium.
- **Unknowns:** design system readiness for pervasive truth-label chips.

#### Agent 8 — Observability / Testing / Rollout Audit
- **Findings:** Some tests exist for dedupe/import parsers; no comprehensive provider-failure synthetic suite; telemetry for import/export/sync correctness is sparse.
- **Likely risks:** regressions in replay, partial import, privacy scope not detected pre-prod.
- **Root causes:** feature-level testing over platform-level integration contracts.
- **Governing rules needed:** golden-path + failure-path synthetic integration suite.
- **Recommended fixes:** CI matrix for replay/out-of-order/outage + drift assertions.
- **Confidence:** High.
- **Unknowns:** current staging chaos/simulation tooling.

### Concrete System/Path Inventory

- **Linked account providers:** Gmail accounts in `gmail_accounts`; OAuth orchestration in `supabase/functions/gmail-auth`; inbox scanning in `supabase/functions/gmail-import-worker`.
- **Import paths:**
  - Gmail → `gmail_import_jobs` + `gmail_import_message_logs` + `smart_import_candidates` → user review UI (`SmartImportReview`) → `trip_artifacts` materialization.
  - File/image/PDF import via `SmartImport` + `file-ai-parser` and via calendar/agenda/lineup parser utilities.
  - iOS share extension intake → `shared_inbound_items` → destination materialization to links/chat/tasks/calendar.
- **Export paths:**
  - Trip PDF export (`supabase/functions/export-trip`).
  - User data export archive + signed URL (`supabase/functions/export-user-data`, `useDataExport`).
  - Calendar ICS export (`useCalendarExport`, `calendarExport`).
- **Sync directions:**
  - Stripe webhook: external→Chravel one-way entitlement sync.
  - Gmail: external→Chravel pull-scan import (not continuous bidirectional sync).
  - Calendar: largely Chravel-owned with export and optional provider integration tables; no robust two-way conflict model.
- **Webhook/poll paths:** Stripe webhook with idempotency table; Gmail/other integrations primarily request-triggered pull.
- **External identifiers:** partial usage (`google_user_id`, Gmail message IDs, Stripe event IDs, `google_event_id` on `trip_events`), but no universal external object identity model.
- **Reconciliation paths:** ad-hoc dedupe/skip logic; no common reconciliation jobs across providers.
- **AI extraction paths:** `file-ai-parser`, `enhanced-ai-parser`, `receipt-parser`, plus chat parser orchestration.
- **High blast-radius points:** direct materialization into core objects from parser outputs, weak partial-success semantics, and inconsistent event idempotency.

## 3. Source-of-Truth Constitution

1. **Truth classes (mandatory):**
   - `external_authoritative`: canonical in provider; Chravel stores mirrored projection.
   - `chravel_authoritative`: canonical in Chravel; external is optional projection/export.
   - `import_snapshot`: one-time capture from external artifact/email/file.
   - `ai_inferred`: machine-inferred candidate, never durable shared truth until user/system confirmation.
   - `user_confirmed_import`: promoted from candidate by explicit confirmation.
2. **Ownership defaults:**
   - Gmail/email/PDF/image/CSV inputs are `import_snapshot`/`ai_inferred` until confirmed.
   - `trip_events`, tasks, polls, chat remain `chravel_authoritative` unless explicit provider sync contract exists.
   - Stripe entitlement status is `external_authoritative` with Chravel as feature-gating cache.
3. **No implicit merge rule:** Never merge two records across providers without explicit match evidence (`external_id` + deterministic key + confidence threshold + confirmation policy).
4. **External identifier rules:** Every synced/imported object must store `(provider, provider_account_id, external_object_type, external_object_id, source_event_id)` where available.
5. **Override rules:**
   - Chravel can override imported snapshots only by creating a new Chravel-owned object linked to source provenance.
   - External systems may override only objects explicitly marked two-way-syncable with version/cursor controls.
6. **Linked-account rules:** A provider account is user-owned unless explicitly delegated for org/trip scope with explicit grant and revocation.

## 4. Import Constitution

1. **Stages:** `received` → `normalized` → `parsed` → `deduped` → `candidate_staged` → `confirmed|rejected` → `materialized`.
2. **Parsing/extraction rules:** Parsing output must include field-level confidence + parser version + model/provider metadata.
3. **AI rules:** AI output defaults to `ai_inferred`; no silent direct writes to shared trip truth without review or high-confidence deterministic policy.
4. **Confidence thresholds:**
   - High confidence deterministic fields (dates, confirmation codes): may auto-stage.
   - Ambiguous semantic fields (reservation type/location guess): require user confirmation.
5. **Duplicate suppression:**
   - Required keys: provider message/file hash + normalized business key + trip scope.
   - Dedupe windows must be durable (not only 5-minute local windows for share extension).
6. **Idempotency:** import run requests require idempotency key; rerun should upsert run status and skip already-materialized rows safely.
7. **Partial handling:** terminal status must distinguish `completed_partial`; UI must show counts by `imported/skipped/failed` and provide replay path.
8. **Attribution:** materialized rows must retain source reference (`import_run_id`, `candidate_id`, provider metadata).
9. **Definition of “import succeeded”:**
   - **Technical:** all mandatory stages finished and persisted, with deterministic counts.
   - **UX:** user sees completeness state and unresolved errors, not just a success toast.

## 5. Export Constitution

1. **Scoping:** exports must be principal-scoped (requesting user, role, trip/org context) and include only authorized rows.
2. **Authorization:** server-side auth required; no client-side trust. Export functions must assert membership/role before data assembly.
3. **Completeness:** every export has manifest with table/object counts, skipped sections, and reason codes.
4. **Generation rules:** if any mandatory section fails, export should fail or be explicitly marked partial.
5. **Delivery/sharing:** signed URLs must be short-lived, logged, and tied to requestor identity.
6. **Stale snapshots:** embed `generated_at` and `source_watermark` timestamps; UX must state snapshot semantics.
7. **Admin/report exports:** require higher privilege with explicit audit logs and field-level redaction policy.
8. **Privacy redaction:** redaction must be schema-aware, not substring-only on key names.
9. **Definition of “export succeeded”:** artifact generated, authorization checks passed, manifest complete, and staleness disclosed.

## 6. Sync + Reconciliation Constitution

1. **Webhook rules:** verify signature, persist raw event envelope, enforce idempotency key uniqueness, ack only after durable write.
2. **Polling rules:** use persisted cursor/window; never rely on “last run timestamp” in memory only.
3. **Replay/idempotency rules:** all mutating sync handlers must be idempotent by external event/object key.
4. **Retry rules:** bounded retries + dead-letter queue for poison events.
5. **Out-of-order handling:** version/timestamp comparisons and causal ordering metadata per object.
6. **Credential refresh/reconnect:** explicit state machine (`active`, `expiring`, `expired`, `reauth_required`, `revoked`).
7. **Drift detection:** scheduled compare jobs for key object families and reconciliation reports.
8. **Conflict detection:** detect concurrent local vs external mutations; do not silently last-write-win for two-way objects.
9. **Reconciliation jobs:** periodic plus on-demand replays with idempotent upserts and audit trails.
10. **Operator repair flow:** UI/API actions: inspect lineage, replay event, rebuild projection, unlink/relink provider.
11. **Two-way safety rule:** two-way sync allowed only when provider supports stable object IDs + change versions + conflict semantics; otherwise one-way import/export only.

## 7. Permissions + Privacy Constitution

1. **Who may import:** trip member with import permission for that trip scope; personal imports default private until published.
2. **Who may export:** user can export own data; trip/org exports require role-based grants.
3. **Who may link providers:** only account owner (or delegated org admin for org-scoped providers).
4. **Private vs shared imports:** email/attachments start user-private staging; explicit publish action required to share to trip.
5. **Revocation/deletion effects:** provider disconnect must stop sync/import immediately and purge or tombstone retained secrets/tokens per policy.
6. **Retention:** minimum-necessary retention for raw third-party payloads; define TTL by provider/object class.
7. **AI extraction scope:** models receive only minimal needed content; no cross-trip leakage; keep extraction artifacts scoped.
8. **Redaction/minimization:** exports and logs must exclude non-requestor private linked-account metadata unless authorized.
9. **Server enforcement:** RLS + server-side checks remain source of access control truth; UI controls are advisory only.

## 8. Performance + Scale Stage Plan

### Stage A: baseline imports/exports and limited one-way integrations
- **Bottlenecks:** ad-hoc parser endpoints and direct writes.
- **Requirements:** canonical import/export state machine; enforce idempotency keys for import runs.
- **Outage handling:** explicit degraded states; retry queues with visibility.
- **Privacy/permissions:** private staging defaults.
- **Observability:** import/export success+partial+failure counters.
- **Unsafe without redesign:** adding new providers without shared contracts.

### Stage B: moderate provider growth and heavier trip/pro usage
- **Bottlenecks:** duplicated provider logic and inconsistent dedupe keys.
- **Requirements:** integration registry + external object identity tables.
- **Outage handling:** provider health windows and backfill orchestration.
- **Privacy/permissions:** role-based export scopes + audit logs.
- **Observability:** per-provider SLOs, replay metrics, drift counts.
- **Unsafe without redesign:** scaling two-way semantics on one-off code paths.

### Stage C: more two-way sync pressure and operational dependence
- **Bottlenecks:** conflict arbitration, event ordering, reconciliation throughput.
- **Requirements:** event ledger, version-aware merge policies, operator conflict queues.
- **Outage handling:** deterministic catch-up from persisted cursors.
- **Privacy/permissions:** org-level delegated linking boundaries.
- **Observability:** convergence lag and drift half-life metrics.
- **Unsafe without redesign:** pretending eventual consistency without convergence proofs.

### Stage D: mature integration platform with strong reconciliation and support tooling
- **Bottlenecks:** cross-provider coordination and support workflows.
- **Requirements:** full repair console, replay sandbox, schema evolution contracts.
- **Outage handling:** automated failover modes and customer-visible incident states.
- **Privacy/permissions:** formal retention + deletion attestations.
- **Observability:** end-to-end traceability from provider event to user-visible object.
- **Unsafe without redesign:** mission-critical sync without formal contracts and auditability.

## 9. Dangerous Failure Modes

1. **Duplicate imports (severity: High, likelihood: High, blast radius: Trip-level clutter/data trust loss)**
   - Root cause: inconsistent dedupe strategy by pipeline.
   - Fix: canonical dedupe keys + unique constraints + idempotent materialization.
   - Timing: Immediate.
2. **Partial import marked as success (High/High/Trip+user trust)**
   - Root cause: success toasts without strict completion semantics.
   - Fix: partial terminal states + mandatory surfaced failed counts.
   - Timing: Immediate.
3. **AI extraction creates wrong structured objects (High/Medium/Trip planning errors)**
   - Root cause: inference promoted too quickly.
   - Fix: truth labels + confirmation workflows for ambiguous fields.
   - Timing: Immediate.
4. **Webhook replay duplicates records (High/Medium/Billing or entitlement corruption)**
   - Root cause: idempotency not universal beyond Stripe.
   - Fix: common event ledger and unique constraints by provider event IDs.
   - Timing: Immediate.
5. **Out-of-order sync corrupts local truth (High/Medium/Cross-object drift)**
   - Root cause: no version/cursor arbitration.
   - Fix: per-object monotonic version checks.
   - Timing: Staged (B/C).
6. **Missed webhook leaves stale state (Medium/High/Feature gating drift)**
   - Root cause: no reconciliation sweep.
   - Fix: scheduled reconciliation and stale markers.
   - Timing: Immediate + Stage B.
7. **Export leaks unauthorized data (Critical/Low-Med/Compliance incident)**
   - Root cause: broad table scans + weak schema-aware redaction.
   - Fix: strict scope queries + deny-by-default field maps.
   - Timing: Immediate.
8. **User-private import becomes trip-shared accidentally (Critical/Medium/Privacy breach)**
   - Root cause: direct materialization without private staging boundary.
   - Fix: enforce private staging + explicit publish.
   - Timing: Immediate.
9. **Reconnect after outage causes drift (High/Medium/Ongoing inconsistencies)**
   - Root cause: missing cursor-aware backfill.
   - Fix: provider cursors + reconciliation job post-reconnect.
   - Timing: Stage B.
10. **Account deletion leaves linked provider state exposed (Critical/Low-Med/Compliance breach)**
   - Root cause: unclear retention/tombstone policies.
   - Fix: deletion workflow that revokes tokens and purges encrypted credentials + orphan scans.
   - Timing: Immediate.
11. **No operator repair path (High/High/Support escalation risk)**
   - Root cause: missing replay/reconcile tooling.
   - Fix: ops repair APIs and runbooks.
   - Timing: Stage B.
12. **Two-way conflicts with no winner policy (Critical/Medium/incorrect trip truth)**
   - Root cause: no explicit conflict model.
   - Fix: permit two-way only with versioned merge rules.
   - Timing: Stage C.

## 10. Recommended Immediate Fixes

1. Create a unified **integration run ledger** for imports/sync/exports with idempotency keys and standardized statuses.
2. Add required provenance columns (provider/account/external object/event IDs) to materialized imported objects.
3. Enforce private staging for all third-party imports before trip-share publication.
4. Add partial-success semantics and manifest counts to both import and export responses + UI surfaces.
5. Implement universal idempotency middleware for edge functions receiving webhook/poll/import triggers.
6. Add reconciliation cron for Stripe entitlements, Gmail import drift indicators, and calendar external ID consistency.
7. Harden export-user-data completeness checks (no silent skips for mandatory user-owned tables).
8. Introduce integration observability dashboard metrics: import partial rate, duplicate suppression rate, replay drops, reconciliation lag.

## 11. Exact Code / Schema / Infra Changes

1. **Schema (new):**
   - `integration_provider_accounts` (normalized linked accounts, lifecycle state).
   - `integration_object_links` (internal↔external object mapping with ownership flags).
   - `integration_runs` + `integration_run_steps` (import/export/sync state machine).
   - `integration_events` (webhook/poll envelopes + replay status).
2. **Schema (alter):**
   - Add provenance fields to `trip_artifacts`, `trip_events`, and other materialized import targets where missing.
   - Add unique constraints for dedupe/idempotency (trip scope + provider key).
3. **Code modules to modify:**
   - `supabase/functions/gmail-import-worker/index.ts` → write through `integration_runs` and candidate truth labels.
   - `supabase/functions/file-ai-parser/index.ts`, `enhanced-ai-parser/index.ts`, `receipt-parser/index.ts` → structured confidence and staged outcomes.
   - `src/features/smart-import/components/*` + import modals → display partial/completeness/truth labels.
   - `supabase/functions/export-user-data/index.ts`, `export-trip/index.ts` → emit manifests and strict partial rules.
   - `supabase/functions/calendar-sync/index.ts` → explicit one-way/two-way policy and external ID/version checks.
4. **Webhook/polling/retry:**
   - Add shared idempotency helper in `supabase/functions/_shared` and migrate webhook-like handlers.
5. **Reconciliation jobs:**
   - Add scheduled edge function(s): `integration-reconcile-*` per provider family.
6. **Permission/privacy:**
   - Add server-enforced publish action endpoint from private staged import to shared trip objects.
7. **Telemetry:**
   - Emit structured events for each run step and failure reason.
8. **Migration order:**
   - (a) new tables + backfill,
   - (b) dual-write from existing flows,
   - (c) read switch,
   - (d) remove legacy direct-write shortcuts.
9. **Deploy order:** schema → edge functions dual-write → frontend truth-label UX → reconciliation jobs → cutover flags.
10. **Rollback plan:** disable new read paths via feature flags, keep legacy writes intact during dual-write period, revert migrations by dropping new tables only after backout.

## 12. Verification Plan

- **Import correctness tests:** Gmail candidate generation deterministic counts; file/image/pdf parser outputs include provenance + confidence; CSV/calendar import duplicate checks.
- **Partial/error-path tests:** forced parser failures must return `completed_partial` with failed-count and retry token.
- **Duplicate/replay tests:** repeated Gmail scans/webhook events do not create duplicate materialized records.
- **Out-of-order sync tests:** provider updates with older versions are rejected/tombstoned.
- **Export auth/privacy tests:** non-member trip export denied; user export excludes unauthorized tables/fields.
- **Credential refresh tests:** expired Gmail token path transitions to reconnect-required without silent failure.
- **Reconciliation tests:** injected drift is detected and converges after reconcile job.
- **AI extraction scope/confirmation tests:** inferred fields require confirmation before publish.
- **Outage/recovery simulations:** provider 429/5xx storms with retries + eventual convergence.
- **Load simulations:** bulk import jobs and concurrent exports with manifest integrity.

**Local repro steps:**
1. Trigger Gmail import with test account; verify run/candidate statuses and dedupe on repeat.
2. Upload same PDF/image twice; verify duplicate suppression and partial markers.
3. Generate trip export and user export; verify manifest counts and auth gates.

**Staging repro steps:**
1. Replay Stripe events in staging webhook endpoint.
2. Expire provider tokens and verify reconnect UX/state transitions.
3. Run reconciliation job and inspect drift report dashboard.

**Synthetic provider-failure scenarios:**
- 429 burst, out-of-order delivery, duplicated events, missing webhook window, token revocation mid-run.

**Launch thresholds:**
- duplicate materialization <0.1%, partial import transparency 100%, reconciliation lag p95 < 15m, unauthorized export incidents = 0.

**Rollback triggers:**
- any unauthorized export, replay duplication >1%, reconciliation lag >1h sustained, or unexplained drift on core objects.

## 13. Post-Fix Scorecard

- provider-model coherence: **58/100** (fragmented contracts)
- source-of-truth clarity: **54/100** (no unified truth labels/ownership policy)
- import correctness: **62/100** (good local controls, weak global lifecycle)
- export correctness/privacy safety: **68/100** (membership checks exist; completeness/redaction model still fragile)
- sync/replay/idempotency safety: **60/100** (Stripe stronger, others inconsistent)
- reconciliation maturity: **42/100** (minimal systemic drift tooling)
- permissions/privacy safety: **73/100** (RLS and safe views are good; staging/publish boundaries inconsistent)
- observability: **49/100** (limited end-to-end integration telemetry)
- production readiness: **57/100** (works for limited one-way imports, unsafe for broad two-way promises)

**Why below 95:** No unified integration platform abstractions, incomplete idempotency/reconciliation architecture, and inconsistent truth labeling across import/export/sync paths.
