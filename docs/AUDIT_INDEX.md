# Audit Index

> Canonical index of all security, architecture, platform, and feature audits.
> Updated: 2026-03-16

---

## How to Use

- Before starting work on a subsystem, check which audits cover it using the coverage matrix below
- Each entry links to the source document with a summary of what it found
- **Priority reading** items are marked — start there if you're new to the codebase
- Status: `current` (actively maintained), `reference` (point-in-time but still relevant), `historical` (superseded or outdated)

---

## Coverage Matrix

| Subsystem | Security | Architecture | Performance | Readiness | Schema/Data | Last Audited |
|-----------|:--------:|:------------:|:-----------:|:---------:|:-----------:|:------------:|
| Auth / RLS | x | x | - | - | x | 2026-03-15 |
| Chat / Messaging | x | x | x | - | x | 2026-03-16 |
| AI Concierge | x | x | - | - | - | 2026-03-11 |
| Payments / Billing | x | - | - | - | - | 2026-03-07 |
| Calendar | - | x | - | - | - | 2026-03 |
| Notifications | x | x | - | - | - | 2026-03-15 |
| Media / Storage | x | - | - | - | - | 2026-03-15 |
| Maps / Places | - | x | - | - | - | - |
| Smart Import | x | x | - | - | - | 2026-03 |
| iOS / App Store | - | - | - | x | - | 2026-01-10 |
| Polls / Tasks | - | x | - | x | - | 2026-02 |
| Data Evolution | - | - | - | - | x | 2026-03-15 |
| Reliability / DR | - | - | - | x | - | 2026-03-16 |
| Design System | - | - | - | - | - | 2026-02-27 |
| Permissions | x | x | - | - | - | 2026-03-15 |
| Full Platform | x | x | x | x | x | 2026-03-15 |

---

## Start Here (Top 5 for New Developers)

| Document | Why Read It |
|----------|-------------|
| `CLAUDE.md` (repo root) | Engineering manifesto, hard constraints, security gate, build requirements |
| `SYSTEM_MAP.md` (repo root) | 12 subsystems with dependencies, failure modes, sources of truth |
| `PLATFORM_AUDIT_CONSTITUTION.md` (repo root) | Full platform assessment across 9 domains, 55% readiness at 100K MAU |
| `docs/ACTIVE/ARCHITECTURE_DECISIONS.md` | Why Supabase, Capacitor, TanStack Query, Google Maps were chosen |
| `DEBUG_PATTERNS.md` (repo root) | Known bug patterns — what breaks and how to fix it |

---

## Chronological Audit Log

### 2026-03 (March)

| Date | Document | Status | Scope | Key Findings |
|------|----------|--------|-------|-------------|
| 03-16 | `docs/audits/reliability-resilience-constitution-2026-03-16.md` | current | SLO, disaster recovery, capacity, queue resilience | Controls exist but drill evidence missing; need formal SLO targets |
| 03-15 | `PLATFORM_AUDIT_CONSTITUTION.md` | current | Full platform (9 domains) | 55% ready for 100K MAU; gaps in RLS, media, AI, scale |
| 03-15 | `NOTIFICATION_AUDIT.md` | current | Notification delivery, badges, preferences | Dual-path dedup fixed for broadcasts; reconnect correction added |
| 03-15 | `docs/ACTIVE/SHARED_MUTATION_AUDIT.md` | current | Mutation permissions across trip types | useMutationPermissions added to 5 hooks; consumer/pro/event model |
| 03-15 | `docs/audits/data-evolution-constitution-2026-03-15.md` | current | Migration safety, schema evolution | Expand/contract phases recommended; destructive changes need two-phase |
| 03-11 | `AUDIT_CONCIERGE_LIVE.md` | current | Gemini Live voice feature | Dead code found (VoiceLiveOverlay); reconnect state added |
| 03-07 | `SECURITY_SCALE_AUDIT_2026_03_07.md` | current | 10 threat vectors at scale | Rate limiting gaps, cron auth, webhook idempotency |
| 03-xx | `docs/audits/integrations-import-export-sync-constitution-2026-03.md` | current | Gmail import, file parser, exports | Fragmented semantics; state machine architecture needed |
| 03-xx | `docs/GMAIL_SMART_IMPORT_AUDIT_2026-03.md` | current | Gmail import hardening | Sub-90 components mapped to closure criteria |

### 2026-02 (February)

| Date | Document | Status | Scope | Key Findings |
|------|----------|--------|-------|-------------|
| 02-27 | `docs/design-system-consistency-audit.md` | reference | UI consistency across features | Design token drift, component variation |
| 02-27 | `docs/TASKS_LAUNCH_READINESS_AUDIT.md` | reference | Tasks feature readiness | Dogfood-first approach recommended |
| 02-22 | `docs/PERFORMANCE_AUDIT_7795.md` | reference | API egress, performance | 381K+ REST calls identified; optimization targets |
| 02-21 | `docs/ACTIVE/SCHEMA_AUDIT.md` | current | Full-stack schema consistency | Top-down DB → types → hooks → UI field tracing |
| 02-18 | `docs/polls-tasks-architecture-audit.md` | reference | Polls + tasks architecture | Desktop/mobile/tablet audit |
| 02-09 | `SECURITY-AUDIT-2026-02-09.md` | reference | Full codebase security | White-box OWASP methodology |

### 2026-01 (January) and Earlier

| Date | Document | Status | Scope | Key Findings |
|------|----------|--------|-------|-------------|
| 01-28 | `BUNDLE_SIZE_BASELINE.md` | reference | Bundle size baseline | Baseline measurements for tracking |
| 01-10 | `APP_STORE_READINESS_AUDIT.md` | reference | iOS App Store readiness | 82/100 score; critical blockers identified for human tasks |
| 01-04 | `docs/QA_PARITY_AUDIT.md` | reference | E2E functional + demo parity | Functional audit across flows |
| 2025-11 | `AUDIT_EXECUTIVE_SUMMARY.txt` | historical | Full codebase executive summary | High-level assessment |
| 2025-03 | `SECURITY_AUDIT_REPORT.md` | historical | Red team (5 attacker profiles) | 58/100 score; 7 critical vulnerabilities (many since fixed) |

---

## Additional Audit-Adjacent Documents

### Security & Compliance
| Document | Scope |
|----------|-------|
| `docs/ACTIVE/AUTHORIZATION_AUDIT.md` | Pro trips authorization gaps |
| `docs/ACTIVE/SECURITY_FINDINGS.md` | Consolidated security findings |
| `docs/SECURITY.md` | Security policies |
| `SECURITY.md` (root) | Security disclosure policy |
| `docs/SECURE_STORAGE_ACCESS.md` | Storage access patterns |
| `docs/SECURITY_FIXES_REQUIRED.md` | Outstanding security fixes |

### Architecture & Design
| Document | Scope |
|----------|-------|
| `docs/ARCHITECTURE.md` | System architecture overview |
| `docs/SINGLE_MAP_ARCHITECTURE.md` | Map component architecture (single instance) |
| `docs/CALENDAR_ARCHITECTURE_REVIEW.md` | Calendar sync architecture |
| `docs/GEMINI_LIVE_ARCHITECTURE_REPORT.md` | Gemini Live voice architecture |
| `docs/AI_CONCIERGE_TOOLS_AND_GUARDRAILS.md` | AI tool calling safety boundaries |
| `docs/AI_CONCIERGE_RAG_FORENSIC_AUDIT.md` | RAG system forensic analysis |
| `docs/SMS_NOTIFICATION_DELIVERY_ARCHITECTURE.md` | SMS/notification delivery |
| `docs/TWILIO_SMS_ARCHITECTURE_REPORT.md` | Twilio SMS integration |
| `docs/ACTIVE/AUDIT_STRUCTURED_OBJECTS.md` | Structured objects audit |

### Operational
| Document | Scope |
|----------|-------|
| `docs/ACTIVE/RELEASE_ENGINEERING_CONSTITUTION.md` | Release engineering rules |
| `docs/ACTIVE/INCIDENT_RESPONSE.md` | Incident response procedures |
| `docs/ACTIVE/ROLLBACK_RUNBOOK.md` | Rollback procedures |
| `docs/ACTIVE/SECRET_ROTATION.md` | Secret rotation procedures |
| `docs/DISASTER_RECOVERY.md` | Disaster recovery plan |
| `docs/CACHE_INVALIDATION_ANALYSIS.md` | Cache invalidation patterns |

### Feature-Specific Reports
| Document | Scope |
|----------|-------|
| `RECOMMENDATIONS_AUDIT.md` | Recommendations feature productionization |
| `docs/GEMINI_LIVE_FIX_REPORT.md` | Gemini Live bug fix report |
| `docs/GEMINI_LIVE_INVESTIGATION_REPORT.md` | Gemini Live investigation |
| `docs/OFFLINE_SYNC_DATA_LOSS_FIX.md` | Offline sync data loss fix |
| `docs/LOVABLE_UPDATE_ANALYSIS.md` | Lovable platform update analysis |
| `docs/MIGRATION_OVERLAP_RISK_REPORT.md` | Migration overlap risk assessment |
| `docs/audits/polls-launch-readiness.md` | Polls feature launch readiness |

---

## Constitution Documents

These are the most comprehensive audits, each covering a full domain with governing rules and action plans:

| Document | Domain | Lines |
|----------|--------|-------|
| `PLATFORM_AUDIT_CONSTITUTION.md` | Full platform (9 domains) | ~923 |
| `docs/audits/reliability-resilience-constitution-2026-03-16.md` | Reliability, DR, capacity | ~650 |
| `docs/audits/data-evolution-constitution-2026-03-15.md` | Data modeling, schema evolution | ~560 |
| `docs/audits/integrations-import-export-sync-constitution-2026-03.md` | Integration architecture | ~690 |
| `docs/ACTIVE/RELEASE_ENGINEERING_CONSTITUTION.md` | Release engineering | ~300 |
