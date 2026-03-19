# Audit Index

> Quick-reference for 9 audit documents (5,500+ lines total).
> Read specific sections by line number instead of entire files.
> Last updated: 2026-03-18

---

## Chronology

| Date | File | Scope | Score/Status | Lines |
|------|------|-------|-------------|-------|
| 2026-01-10 | APP_STORE_READINESS_AUDIT.md | iOS launch readiness (Capacitor + RevenueCat) | 82/100 | 471 |
| 2026-03-05 | SECURITY_AUDIT_REPORT.md | Red team — 5 attacker profiles, 34 vulnerabilities | 58/100 | 527 |
| 2026-03-07 | SECURITY_SCALE_AUDIT_2026_03_07.md | Scale + rate limiting across 10 threat vectors | MODERATE RISK | 260 |
| 2026-03-11 | AUDIT_CONCIERGE_LIVE.md | Gemini Live voice — forensic end-to-end | 5 failure points | 472 |
| 2026-03-15 | PLATFORM_AUDIT_CONSTITUTION.md | Full-stack 9-domain audit (66 tables) | 55% readiness | 923 |
| 2026-03-15 | NOTIFICATION_AUDIT.md | Notification generation, delivery, scale | Fragmented | 1190 |
| undated | RECOMMENDATIONS_AUDIT.md | Recommendations/ads feature productionization | Hybrid mock/real | 650 |
| 2026-03-18 | AUDIT_CONCIERGE_ARCHITECTURE_2026_03_18.md | AI Concierge prompt + tool + context forensic audit | 10 refactor priorities | ~450 |
| 2026-03 | YC_APPLICATION_SHOWCASE.md | AI agent orchestration — 311K LOC showcase | Narrative | 557 |

---

## System Coverage Matrix

| System | Platform | Security | Scale | Concierge | Notification | AppStore | Recommendations |
|--------|----------|----------|-------|-----------|-------------|----------|-----------------|
| Trip Management | L64 | L20 | — | — | — | — | — |
| Unified Messaging | L275 | L139 | — | — | L40 | — | — |
| AI Concierge | L501 | L139 | L17 | L9 | L40 | — | — |
| Calendar & Events | L64 | L139 | — | — | — | — | — |
| Payments | L192 | L139 | L17 | — | — | L101 | — |
| Smart Import | — | — | — | — | — | — | — |
| Media Gallery | L420 | L139 | L17 | — | — | — | — |
| Maps & Places | — | — | — | — | — | — | — |
| Organizations | L121 | L298 | — | — | — | — | — |
| Notifications | L275 | — | L17 | — | L9 | — | — |

> Line numbers are approximate section starts. Use `L{n}` to jump with your editor.

---

## Section Index

### PLATFORM_AUDIT_CONSTITUTION.md (923 lines)
- L26: Executive Summary (strengths, critical gaps, risk matrix)
- L64: Domain Model & Data Architecture (66 tables, entity relationships)
- L121: Authorization & RLS (policy patterns, vulnerabilities)
- L192: Concurrency, Races & Idempotency (RACE-1 payment double-credit, IDEM-1 missing keys)
- L275: Realtime & Presence (channel types, hot-trip isolation)
- L353: Growth, Invites & Account Lifecycle (Math.random invite codes)
- L420: Media Pipeline & Storage (MEDIA-1 through MEDIA-5)
- L501: AI Tooling & Agent Safety (spending bounds, tool execution)
- L574: Scale, QoS & Rate Limiting
- L655: Observability, Migrations & Deployment
- L722: Cost Exposure Analysis
- L823: Prioritized Action Plan

### NOTIFICATION_AUDIT.md (1190 lines)
- L9: Executive Summary (fragmented but operational, trust/noise/scale risks)
- L40: Full Attention System Map (event sources, delivery paths)
- L179: Notification Constitution (what deserves notification vs feed vs silent)
- L268: Unread + Badge Constitution
- L349: Preference + Relevance Constitution
- L461: Activity Feed Constitution
- L538: Realtime + Multi-Device Constitution
- L610: Performance + Scale Stage Plan
- L734: Dangerous Failure Modes
- L903: Recommended Immediate Fixes
- L963: Exact Code/Schema/Infra Changes

### SECURITY_AUDIT_REPORT.md (527 lines)
- L10: Executive Summary (58/100, 7 CRIT / 12 HIGH / 9 MED / 6 LOW)
- L20: Critical Vulnerabilities (hardcoded keys, wildcard CORS, demo admin, jsPDF CVE)
- L139: High Vulnerabilities (CVEs, XSS, rate limiting, AI write access)
- L259: Medium Vulnerabilities
- L324: Attack Path Scenarios
- L383: Fix Roadmap
- L437: Monitoring Recommendations
- L486: Source-Code-Aware Attacker Analysis

### SECURITY_SCALE_AUDIT_2026_03_07.md (260 lines)
- L9: Executive Summary
- L17: Findings by Area (viral traffic, bots, auth stress, DB contention, AI abuse, uploads, webhooks)
- L198: Changes Implemented
- L237: Priority Backlog

### AUDIT_CONCIERGE_LIVE.md (472 lines)
- L9: Component Inventory (5 frontend, 8 hooks, 13 libs, 4 edge functions)
- L58: End-to-End Flow Map
- L138: Bug Diagnosis — 5 Ranked Failure Points
- L225: Supabase Edge Functions Audit
- L269: Secrets/Env Vars Audit
- L302: Dead Code/Drift Audit
- L385: Final Output (verdict + fix order)

### APP_STORE_READINESS_AUDIT.md (471 lines)
- L10: Executive Summary (82/100, 4 P0 blockers)
- L58: Updated Readiness Matrix
- L101: Bucket A — Implemented & Ready
- L133: Bucket B — AI-Implementable
- L362: Bucket C — Human-Only (RevenueCat prod key, APNs, Team ID)
- L427: Summary of What's Left

### RECOMMENDATIONS_AUDIT.md (650 lines)
- L5: Current State Audit (6 real Supabase tables, hybrid mock/real)
- L66: Product Recommendation (goals, monetization)
- L108: System Architecture (new tables, services, ranking)
- L271: Targeting + Ranking Strategy
- L374: MVP Build Recommendation
- L425: Implementation Plan
- L514: Risks/Tradeoffs

### YC_APPLICATION_SHOWCASE.md (557 lines)
- L39: The Numbers (311K LOC, 606 PRs, 479 components)
- L91: The AI Agent Orchestra (7 agents, roles)
- L115: Multi-Agent Workflow (4 phases)
- L162: Meta-Prompting System (4 layers)
- L276: Feature Development Cycle
- L365: Why Chravel / Why Now / Why Me

---

## Critical Findings Summary

**Security (from SECURITY_AUDIT_REPORT + SCALE_AUDIT):**
- 7 CRITICAL vulns: hardcoded Supabase keys, wildcard CORS on 26 edge functions, demo admin, jsPDF CVE, service role key exposure, AI prompt injection, client-side admin bypass
- Rate limiting gaps across viral traffic, bots, and file uploads

**Concurrency (from PLATFORM_AUDIT):**
- Payment settlement double-credit race condition (RACE-1)
- Missing idempotency keys on chat, payments, and calendar mutations (IDEM-1)

**Scale (from PLATFORM_AUDIT + NOTIFICATION_AUDIT):**
- No hot-trip isolation (1000 users in one trip chokes realtime for all)
- Notification fanout blocks INSERT transaction (4000 members = 12000 delivery rows synchronously)
- Storage quotas advisory-only, no signed URLs for media

**Voice (from AUDIT_CONCIERGE_LIVE):**
- Deno.upgradeWebSocket not supported in Supabase Edge Functions
- Missing VERTEX_PROJECT_ID / VERTEX_SERVICE_ACCOUNT_KEY secrets
- Circuit breaker aggressive (3 failures in 5 min)

**iOS Launch (from APP_STORE_READINESS):**
- 4 P0 blockers: RevenueCat prod API key, APNs certificate, Apple Team ID, account deletion RPC
