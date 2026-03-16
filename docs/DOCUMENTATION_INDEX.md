# Documentation Index

**Last Updated:** 2026-03-16

Comprehensive guide to all Chravel documentation. For audit-specific documents, see [AUDIT_INDEX.md](AUDIT_INDEX.md).

> **Doc governance:** Active docs live in `docs/ACTIVE/` and are updated monthly. Historical reports live in `docs/_archive/`. See `docs/ACTIVE/README.md` for rules.

---

## Start Here

| Document | Location | Purpose |
|----------|----------|---------|
| **CLAUDE.md** | repo root | Engineering manifesto, hard constraints, security gate, build requirements |
| **SYSTEM_MAP.md** | repo root | 12 subsystems — dependencies, failure modes, sources of truth |
| **DEVELOPER_HANDBOOK.md** | docs/ACTIVE/ | Complete developer onboarding |
| **ENVIRONMENT_SETUP_GUIDE.md** | docs/ACTIVE/ | Local dev setup |
| **CODEBASE_MAP.md** | docs/ACTIVE/ | Detailed file/directory reference (33.9KB) |
| **START_HERE.md** | docs/ACTIVE/ | iOS deployment quick-start |

---

## Architecture & Decisions

### Architecture Overview
- **[SYSTEM_MAP.md](/SYSTEM_MAP.md)** — Subsystem topology with failure modes and external deps
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System architecture overview
- **[CODEBASE_MAP.md](ACTIVE/CODEBASE_MAP.md)** — Detailed file/directory structure
- **[PROJECT_OVERVIEW.md](ACTIVE/PROJECT_OVERVIEW.md)** — Project summary
- **[SINGLE_MAP_ARCHITECTURE.md](SINGLE_MAP_ARCHITECTURE.md)** — Map component single-instance architecture
- **[CALENDAR_ARCHITECTURE_REVIEW.md](CALENDAR_ARCHITECTURE_REVIEW.md)** — Calendar sync architecture
- **[GEMINI_LIVE_ARCHITECTURE_REPORT.md](GEMINI_LIVE_ARCHITECTURE_REPORT.md)** — Gemini Live voice architecture
- **[SMS_NOTIFICATION_DELIVERY_ARCHITECTURE.md](SMS_NOTIFICATION_DELIVERY_ARCHITECTURE.md)** — SMS/notification delivery

### Architecture Decision Records (ADRs)
- **[002-supabase-over-firebase.md](ADRs/002-supabase-over-firebase.md)** — Why Supabase
- **[003-google-maps-over-mapbox.md](ADRs/003-google-maps-over-mapbox.md)** — Why Google Maps
- **[004-tanstack-query-over-redux.md](ADRs/004-tanstack-query-over-redux.md)** — Why TanStack Query
- **[ARCHITECTURE_DECISIONS.md](ACTIVE/ARCHITECTURE_DECISIONS.md)** — Consolidated architecture decisions

---

## Security & Compliance

- **[SECURITY.md](SECURITY.md)** — Security practices and policies
- **[SECURITY_FINDINGS.md](ACTIVE/SECURITY_FINDINGS.md)** — Consolidated security findings
- **[AUTHORIZATION_AUDIT.md](ACTIVE/AUTHORIZATION_AUDIT.md)** — Pro trips authorization gaps
- **[SECRET_ROTATION.md](ACTIVE/SECRET_ROTATION.md)** — Secret rotation procedures
- **[SECURE_STORAGE_ACCESS.md](SECURE_STORAGE_ACCESS.md)** — Storage access patterns
- **[SECURITY_FIXES_REQUIRED.md](SECURITY_FIXES_REQUIRED.md)** — Outstanding security fixes

See also: [AUDIT_INDEX.md](AUDIT_INDEX.md) for all security audits.

---

## Database & Backend

- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** — Database schema documentation
- **[SUPABASE_QUICK_REFERENCE.md](SUPABASE_QUICK_REFERENCE.md)** — Supabase commands and patterns
- **[SUPABASE_MIGRATION_GUIDE.md](SUPABASE_MIGRATION_GUIDE.md)** — Migration authoring guide
- **[SUPABASE_BACKUP_STRATEGY.md](SUPABASE_BACKUP_STRATEGY.md)** — Backup and recovery
- **[SCHEMA_AUDIT.md](ACTIVE/SCHEMA_AUDIT.md)** — Full-stack schema consistency audit
- **[AUDIT_STRUCTURED_OBJECTS.md](ACTIVE/AUDIT_STRUCTURED_OBJECTS.md)** — Structured objects audit

---

## API & Integrations

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** — Edge function API reference
- **[API_INTEGRATION_STATUS.md](API_INTEGRATION_STATUS.md)** — External API integration status
- **[ENV_AND_APIS_REQUIRED.md](ENV_AND_APIS_REQUIRED.md)** — Environment variables and API keys
- **[GOOGLE_MAPS_PLACES_INTEGRATION.md](ACTIVE/GOOGLE_MAPS_PLACES_INTEGRATION.md)** — Maps/Places integration
- **[GOOGLE_CLOUD_TTS_MIGRATION.md](ACTIVE/GOOGLE_CLOUD_TTS_MIGRATION.md)** — Text-to-Speech migration
- **[TWILIO_SMS_ARCHITECTURE_REPORT.md](TWILIO_SMS_ARCHITECTURE_REPORT.md)** — Twilio SMS integration

---

## Deployment & Operations

### Production
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)** — Deployment checklist
- **[PRODUCTION_BUILD_CHECKLIST.md](ACTIVE/PRODUCTION_BUILD_CHECKLIST.md)** — Build checklist
- **[DEPLOYMENT_GUIDE.md](ACTIVE/DEPLOYMENT_GUIDE.md)** — Deployment guide
- **[CI_CD_SETUP.md](CI_CD_SETUP.md)** — CI/CD pipeline setup

### Operational Runbooks
- **[INCIDENT_RESPONSE.md](ACTIVE/INCIDENT_RESPONSE.md)** — Incident response procedures
- **[ROLLBACK_RUNBOOK.md](ACTIVE/ROLLBACK_RUNBOOK.md)** — Rollback procedures
- **[DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)** — Disaster recovery plan
- **[RELEASE_ENGINEERING_CONSTITUTION.md](ACTIVE/RELEASE_ENGINEERING_CONSTITUTION.md)** — Release engineering rules

---

## iOS & Mobile

### Thoughtbot Handoff
- **[THOUGHTBOT_HANDOFF.md](THOUGHTBOT_HANDOFF.md)** — iOS handoff guide (Capacitor workflow + contracts + gotchas)
- **[THOUGHTBOT_ONBOARDING.md](THOUGHTBOT_ONBOARDING.md)** — Access and onboarding checklist

### iOS Feature Specs (`docs/ios/`)
- **[12-native-stack-mapping.md](ios/12-native-stack-mapping.md)** — Web-to-iOS technology mapping
- **[01-trip-management.md](ios/01-trip-management.md)** — Trip management native spec
- **[02-collaboration-sharing.md](ios/02-collaboration-sharing.md)** — Collaboration features
- **[03-chat-messaging.md](ios/03-chat-messaging.md)** — Chat/messaging native spec
- **[04-calendar-itinerary.md](ios/04-calendar-itinerary.md)** — Calendar/itinerary
- **[05-tasks-polls.md](ios/05-tasks-polls.md)** — Tasks and polls
- **[06-media-storage-quotas.md](ios/06-media-storage-quotas.md)** — Media/storage/quotas
- **[07-pro-team-tags-broadcasts.md](ios/07-pro-team-tags-broadcasts.md)** — Pro features/broadcasts
- **[08-notifications.md](ios/08-notifications.md)** — Push/in-app notifications
- **[09-settings-suite.md](ios/09-settings-suite.md)** — Settings
- **[10-billing-subscription.md](ios/10-billing-subscription.md)** — RevenueCat/Stripe billing
- **[11-data-sync-architecture.md](ios/11-data-sync-architecture.md)** — Data sync architecture
- **[appendix-edge-functions.md](ios/appendix-edge-functions.md)** — Edge function API contracts
- **[appendix-supabase-tables.md](ios/appendix-supabase-tables.md)** — Supabase table schemas

### iOS Deployment
- **[IOS_APP_STORE_GUIDE.md](ACTIVE/IOS_APP_STORE_GUIDE.md)** — App Store submission guide
- **[IOS_TESTING_CHECKLIST.md](ACTIVE/IOS_TESTING_CHECKLIST.md)** — iOS testing checklist
- **[IOS_RELEASE_MANUAL_STEPS.md](IOS_RELEASE_MANUAL_STEPS.md)** — Release manual steps
- **[APP_STORE_SCREENSHOTS.md](ACTIVE/APP_STORE_SCREENSHOTS.md)** — Screenshot requirements

### Mobile Guides (`docs/mobile/`)
- **[CAPACITOR_SHIP_PLAN.md](mobile/CAPACITOR_SHIP_PLAN.md)** — Capacitor shipping plan
- **[PUSH_NOTIFICATIONS.md](mobile/PUSH_NOTIFICATIONS.md)** — Push notification implementation
- **[OFFLINE.md](mobile/OFFLINE.md)** — Offline support
- **[HAPTICS.md](mobile/HAPTICS.md)** — Haptic feedback
- **[PERMISSIONS_PRIVACY.md](mobile/PERMISSIONS_PRIVACY.md)** — Permissions and privacy
- **[FILES_SHARING.md](mobile/FILES_SHARING.md)** — File sharing
- **[BACKGROUND.md](mobile/BACKGROUND.md)** — Background tasks
- **[IOS_SMOKE_TEST.md](mobile/IOS_SMOKE_TEST.md)** — iOS smoke test
- **[IOS_POLISH.md](mobile/IOS_POLISH.md)** — iOS polish items

---

## AI & Concierge

- **[AI_CONCIERGE_SETUP.md](AI_CONCIERGE_SETUP.md)** — AI concierge setup guide
- **[AI_CONCIERGE_TOOLS_AND_GUARDRAILS.md](AI_CONCIERGE_TOOLS_AND_GUARDRAILS.md)** — Tool calling safety boundaries
- **[AI_CONCIERGE_RAG_FORENSIC_AUDIT.md](AI_CONCIERGE_RAG_FORENSIC_AUDIT.md)** — RAG system forensic audit
- **[AI_CONCIERGE_TOOL_CALLING_AUDIT.md](AI_CONCIERGE_TOOL_CALLING_AUDIT.md)** — Tool calling audit
- **[AI_CONCIERGE_ADVANCED.md](AI_CONCIERGE_ADVANCED.md)** — Advanced concierge features
- **[AI_CONCIERGE_PERMANENT_FIX.md](AI_CONCIERGE_PERMANENT_FIX.md)** — Concierge fix documentation
- **[AI_CONCIERGE_TIMEOUT_ROOT_CAUSE.md](AI_CONCIERGE_TIMEOUT_ROOT_CAUSE.md)** — Timeout root cause analysis
- **[AI_CONCIERGE_API_ENABLEMENT_PLAN.md](AI_CONCIERGE_API_ENABLEMENT_PLAN.md)** — API enablement plan
- **[VOICE_HARDENING_RUNBOOK.md](VOICE_HARDENING_RUNBOOK.md)** — Voice feature hardening
- **[VOICE_MODE_VERTEX_VS_GOOGLE_AI_ANALYSIS.md](VOICE_MODE_VERTEX_VS_GOOGLE_AI_ANALYSIS.md)** — Vertex vs Google AI comparison

---

## Feature Documentation

- **[PRD.md](PRD.md)** — Product Requirements Document
- **[CHANNELS.md](CHANNELS.md)** — Chat channels feature
- **[MEDIA_SHARE_INTEGRATION.md](MEDIA_SHARE_INTEGRATION.md)** — Media sharing
- **[ADVERTISER_SYSTEM.md](ADVERTISER_SYSTEM.md)** — Advertiser system
- **[BILLING_STRATEGY.md](BILLING_STRATEGY.md)** — Billing strategy
- **[INVITE_DEEP_LINKS.md](INVITE_DEEP_LINKS.md)** — Invite deep link flows
- **[WEB_PUSH_NOTIFICATIONS.md](WEB_PUSH_NOTIFICATIONS.md)** — Web push notifications
- **[FEATURE_STATUS_MATRIX.md](FEATURE_STATUS_MATRIX.md)** — Feature status across platforms
- **[ACCENT_DESIGN_SYSTEM.md](ACCENT_DESIGN_SYSTEM.md)** — Design system reference

---

## Audits & Constitutions

See **[AUDIT_INDEX.md](AUDIT_INDEX.md)** for the full searchable audit index with coverage matrix and chronological log.

### Constitution Documents (Comprehensive Domain Audits)
- **[PLATFORM_AUDIT_CONSTITUTION.md](/PLATFORM_AUDIT_CONSTITUTION.md)** — Full platform (9 domains)
- **[reliability-resilience-constitution-2026-03-16.md](audits/reliability-resilience-constitution-2026-03-16.md)** — Reliability & DR
- **[data-evolution-constitution-2026-03-15.md](audits/data-evolution-constitution-2026-03-15.md)** — Data evolution & schema
- **[integrations-import-export-sync-constitution-2026-03.md](audits/integrations-import-export-sync-constitution-2026-03.md)** — Integrations & sync

---

## Testing & QA

- **[QA_CHECKLIST.md](ACTIVE/QA_CHECKLIST.md)** — QA checklist
- **[VERIFICATION.md](ACTIVE/VERIFICATION.md)** — Verification procedures
- **[TESTING.md](ACTIVE/TESTING.md)** — Testing guide
- **[E2E_TEST_PLAN.md](E2E_TEST_PLAN.md)** — E2E test plan
- **[QA_PARITY_AUDIT.md](QA_PARITY_AUDIT.md)** — QA parity audit
- **[INVITE_FLOW_TEST_CHECKLIST.md](INVITE_FLOW_TEST_CHECKLIST.md)** — Invite flow tests

---

## Agent & AI Tooling Memory

| File | Location | Purpose |
|------|----------|---------|
| **CLAUDE.md** | repo root | Engineering manifesto and hard constraints |
| **AGENTS.md** | repo root | Agent operating principles |
| **DEBUG_PATTERNS.md** | repo root | Recurring bug signatures and proven fixes |
| **LESSONS.md** | repo root | Reusable engineering strategy/recovery/optimization tips |
| **TEST_GAPS.md** | repo root | Missing test coverage by subsystem |
| **agent_memory.jsonl** | repo root | Structured machine-readable memory (14 entries) |
| **TAXONOMY.md** | docs/ACTIVE/ | Labeling taxonomy for issues/PRs/docs |

---

## Organizational Standards

- **[CONTRIBUTING.md](/CONTRIBUTING.md)** — Contribution guidelines and No Regressions Policy
- **[UI_PARITY_GUIDELINES.md](ACTIVE/UI_PARITY_GUIDELINES.md)** — UI consistency guidelines
- **[SHARE_EXTENSION_SETUP.md](ACTIVE/SHARE_EXTENSION_SETUP.md)** — Share extension setup
- **[TAXONOMY.md](ACTIVE/TAXONOMY.md)** — Issue/PR/doc labeling taxonomy

---

## Historical / Archived

Historical documents live in `docs/_archive/`. These are point-in-time reports and plans that are no longer actively maintained but preserved for reference.

Key archived items:
- Early iOS/Android deployment guides
- Sprint manual steps (sprints 2-6)
- Early mobile readiness assessments
- Pre-2026 security audits

---

**Maintained By:** Engineering Team
