# Labeling Taxonomy

> Canonical categories for issues, PRs, docs, and audits.
> Updated: 2026-03-16

---

## Issue & PR Labels

### Type (required — pick one)

| Label | Use When |
|-------|----------|
| `type:bug` | Broken behavior, regression, crash |
| `type:feature` | New capability that didn't exist before |
| `type:enhancement` | Improvement to existing feature |
| `type:refactor` | Code quality change with no behavior change |
| `type:docs` | Documentation only |
| `type:security` | Vulnerability fix or hardening |
| `type:performance` | Latency, bundle size, query optimization |
| `type:test` | Test coverage addition or fix |

### Subsystem (required — pick one or more)

| Label | Scope |
|-------|-------|
| `sub:auth` | Authentication, sessions, RLS enforcement |
| `sub:trips` | Trip CRUD, status, membership, invites |
| `sub:chat` | Messages, channels, broadcasts, threads, reactions |
| `sub:concierge` | AI concierge (text + voice), tool calling |
| `sub:calendar` | Calendar events, Google Calendar sync, RSVP |
| `sub:payments` | Subscriptions (RevenueCat/Stripe), expense splitting, billing |
| `sub:media` | Photos, videos, uploads, storage, AI tagging |
| `sub:maps` | Google Maps, places, location sharing |
| `sub:notifications` | Push, email, in-app, realtime delivery |
| `sub:permissions` | Roles, RLS policies, mutation guards |
| `sub:organizations` | B2B teams, seat billing, org admin |
| `sub:import` | Gmail import, PDF/OCR, artifact ingestion |
| `sub:ios` | iOS/Capacitor specific, native shell |
| `sub:infra` | CI/CD, migrations, edge functions, deployment |

### Severity (for bugs — pick one)

| Label | Criteria |
|-------|----------|
| `sev:critical` | Data loss, security breach, total outage, zero-tolerance path violation |
| `sev:high` | Major feature broken, significant user impact, no workaround |
| `sev:medium` | Feature degraded, workaround exists |
| `sev:low` | Minor, cosmetic, edge case |

### Priority (pick one)

| Label | Meaning |
|-------|---------|
| `pri:p0` | Fix immediately — zero-tolerance paths (Trip Not Found, auth desync, RLS leaks) |
| `pri:p1` | Fix this sprint |
| `pri:p2` | Fix this cycle |
| `pri:p3` | Backlog |

### Special Tags (optional)

| Label | Use When |
|-------|----------|
| `handoff` | Relevant to Thoughtbot iOS handoff |
| `ios-impact` | Change affects native iOS behavior |
| `backend-contract` | Supabase schema, edge functions, RLS policy change |
| `schema-risk` | Migration with column drop, rename, or type change |
| `test-gap` | Missing test coverage identified |
| `tech-debt` | Known shortcut or cleanup candidate |

---

## Document Categories

Use these in doc headers and the audit index:

| Category | Description |
|----------|-------------|
| `audit` | System audit (security, architecture, performance, readiness) |
| `spec` | Feature specification or requirements doc |
| `guide` | How-to, setup, or onboarding guide |
| `adr` | Architecture Decision Record |
| `runbook` | Operational procedure (deploy, incident, rollback) |
| `constitution` | Governance/rules document (engineering manifesto, audit constitution) |
| `handoff` | Developer onboarding or vendor handoff |

### Audit Subtypes

| Subtype | Scope |
|---------|-------|
| `audit:security` | Vulnerability analysis, threat modeling |
| `audit:architecture` | System design review, dependency analysis |
| `audit:performance` | Latency, bundle size, query optimization |
| `audit:readiness` | Launch/ship readiness assessment |
| `audit:schema` | Database/data model review |
| `audit:parity` | Feature parity (web/mobile/demo) |

---

## Usage Guidance

### Combining Labels
- Every issue/PR should have exactly **one type** and **at least one subsystem**
- Bugs should also have a **severity** and **priority**
- Add **special tags** when applicable (especially `backend-contract` and `schema-risk` for migration PRs)

### Where to Use
- **GitHub Issues:** Apply as GitHub labels
- **PR Titles:** Prefix with type, e.g. `fix(chat): reconnect backfill on visibility change`
- **Doc Headers:** Include category tag, e.g. `> Category: audit:security`
- **Audit Index:** Use subsystem labels for coverage matrix columns
- **Commit Messages:** Use conventional commit format: `type(subsystem): description`

### PR Title Convention
```
type(subsystem): short description

Examples:
fix(auth): gate trip fetch on session hydration complete
feat(calendar): add recurring event support
docs(handoff): add backend contracts section
refactor(chat): extract message dedup into utility
```
