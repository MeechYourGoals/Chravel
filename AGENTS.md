# AGENTS.md — ChravelApp update to the file

> Make any coding agent productive in this repo immediately. Zero spaghetti. No regressions. Mobile-first. Elegant.

-----

## 0. NON-NEGOTIABLES (read first, enforce always)

1. **No regressions.** Every behavior change requires an explanation + verification checklist. If tests exist, run them. If not, add one.
1. **Small diffs win.** Surgical fixes over refactors. If a refactor is required, phase it — behavior-preserving commits first.
1. **One source of truth.** No duplicate types, constants, or business rules. If you find duplication, consolidate it cleanly.
1. **Type safety > vibes.** No `any` unless it's an intentional boundary — comment it with `// intentional: <reason>`.
1. **Mobile-first UX.** Every UI change is evaluated for small screens + PWA constraints (tap targets ≥44px, scroll, performance).
1. **Performance is a feature.** No heavy re-renders, excessive providers, chatty queries, or unnecessary component mounts.
1. **Demo mode is sacred.** Mock data is NEVER modified. Authenticated mode uses parallel real data paths. This is a hard architectural invariant.
1. **Anti-Goldfish Protocol.** Before coding: read `claude-progress.txt` + recent git log. Implement ONE feature → E2E test → commit → update breadcrumbs. Never multi-task features.
1. **Learn from trajectories.** Before non-trivial tasks, read `DEBUG_PATTERNS.md` + `LESSONS.md`. After completing, update memory files with evidence-backed learnings. See CLAUDE.md § AGENT LEARNING PROTOCOL.

-----

## 1. WHAT CHRAVEL IS

Chravel is the **group travel coordination layer** — consolidating the core trip objects into one place so groups aren't juggling 15+ apps:

|Module               |Description                                 |
|---------------------|--------------------------------------------|
|**Chat / Broadcasts**|Group messaging + announcement channel      |
|**Calendar**         |Shared trip itinerary & scheduling          |
|**Places & Links**   |Curated location bookmarks (not OTA booking)|
|**AI Concierge**     |In-app conversational AI for trip planning  |
|**Polls**            |Group decision-making                       |
|**Tasks**            |Trip to-do management                       |
|**Payments**         |Expense tracking (not a payment processor)  |
|**Media**            |Shared photo/video hub                      |

**Key product surfaces:**

- **Consumer** (free/paid): friend groups, families, travel squads
- **Pro / Enterprise**: touring teams, sports orgs, corporate travel — requires roles, permissions, operational reliability
- **Events**: growth loop / viral engine (event link → guests → new users)

> ⚠️ Chravel is coordination, NOT a full OTA booking engine. Do not build booking aggregation workflows that drag into licensing/compliance traps unless explicitly instructed.

-----

## 2. STACK

```
Frontend:    React 18, TypeScript, TanStack Query, Zustand
Styling:     Tailwind CSS (mobile-first)
Backend:     Supabase (Postgres + RLS + Edge Functions)
Deployment:  Vercel
Mobile:      Capacitor (iOS wrapper) / PWA
Payments:    Stripe
Maps:        Google Maps
Auth:        Supabase Auth + Firebase (notifications)
Repo:        github.com/MeechYourGoals/chravel
```

-----

## 3. DOCS INDEX (navigate before touching)

```
src/
  components/      → Shared UI components
  pages/           → Route-level views (map to product modules above)
  hooks/           → Data fetching + state hooks (single source per feature)
  lib/             → Supabase client, utility functions
  types/           → ALL shared TypeScript types live here — do not duplicate
  store/           → Zustand slices

Key files:
  claude-progress.txt       → Anti-Goldfish breadcrumbs — READ FIRST
  supabase/migrations/      → Schema source of truth
  supabase/functions/        → Edge functions
  capacitor.config.ts       → iOS wrapper config
  vercel.json               → Deployment config
```

> If you don't know where something lives — search. `rg "symbolName"`. Do not guess file paths or APIs.

-----

## 4. GOLDEN WORKFLOW

### Step A — Reproduce & Observe

- Identify exact user path and expected behavior
- Capture: current behavior | desired behavior | definition of done (DoD)

### Step B — Locate the single source of truth

- Types → `src/types/`
- Validators → one place (find it, don't create a second)
- API calls → centralized in hooks or lib — not inline in components
- UI components → `src/components/`

If you find multiples of any of these, pick canonical and delete/redirect the duplicates.

### Step C — Implement the smallest safe change

- Prefer: pure functions, narrow component changes, small testable deltas
- Avoid: "while I'm here" refactors, style churn, mass renames

### Step D — Prove it didn't break

```bash
npm run typecheck && npm run lint && npm run build
```

Run relevant unit/integration tests if present. Add at least one test if none exist for the touched area. Document manual verification steps for key flows.

-----

## 5. CODE QUALITY GATES

### 5.1 No duplicate logic / dead code

Before finalizing any change in an area:

- `rg "symbolName"` to verify import count
- Consolidate duplicate helpers/hook variants
- Delete dead code only when provably unused; deprecate exported APIs first

### 5.2 Field name mismatches = stop-the-line bug

Chravel has historically suffered from:

> DB schema ↔ client types ↔ UI props ↔ query keys mismatches

When you touch any data flow:

- Trace the field **end-to-end**
- Fix at the source, not via mapping hacks
- Update types so mismatches become compile errors

### 5.3 Mobile performance rules

- Memoize expensive derived values (`useMemo`, `useCallback` where stable refs matter)
- Batch queries where possible; cache correctly with TanStack Query
- No heavy deps without explicit justification
- Tap targets ≥ 44px; test scroll behavior on constrained viewports

### 5.4 Logging discipline

- Debug logs must be gated (`if (process.env.NODE_ENV === 'development')`) or structured/intentional
- Remove noisy logs before finalizing any PR

-----

## 6. CODE STYLE

### 6.1 Conventions

- Composition over inheritance
- Small, single-purpose components
- Data fetching: centralize in hooks — never fetch + transform + render in one component
- Enums/unions for states; guard clauses to reject invalid states early

### 6.2 "Make the wrong thing impossible"

- Shared types for all data shapes crossing component/module boundaries
- Narrow interfaces (don't accept `any` where a union works)
- Validate at ingestion (API boundary), not deep in rendering logic

### 6.3 Import discipline

- No circular imports
- No barrel re-exports that bloat bundles without justification
- Tree-shake awareness: don't import entire libraries for one utility

-----

## 7. WHEN SOMETHING IS NOVEL OR HARD

If you hit an unfamiliar framework edge case, build error, or platform limitation:

1. **Search first.** Use web search for the specific error + stack name
1. **Prefer:** official docs → GitHub issues in official repos → reputable engineering blogs
1. **Then implement** with a source link in the commit message or PR description

> Agents hallucinate fixes under pressure. Grounding in sources prevents this.

-----

## 8. PR / CHANGE CHECKLIST

Every change delivered must include:

```
WHAT CHANGED:
- [1–3 bullets]

WHY:
- [user/business reason]

RISK:
- [what could break and why it won't]

PROOF:
- Commands run: [e.g., npm run typecheck && npm run build — ✅]
- Manual verification: [exact steps to confirm the fix]

ROLLBACK:
- [how to safely revert — git revert SHA or feature flag]
```

-----

## 9. ANTI-PATTERNS (never do these)

|❌ Anti-pattern                         |✅ Instead                                  |
|---------------------------------------|-------------------------------------------|
|Invent file paths or APIs              |Search with `rg` first                     |
|Silently change data shapes            |Trace field end-to-end, update types       |
|Add dependencies casually              |Justify every new dep — bundle cost matters|
|Refactor + fix in same commit          |Phase it: fix first, refactor second       |
|Solve inconsistency with mapping layers|Fix at the source                          |
|Touch demo mode mock data              |Never. Hard invariant.                     |
|Multi-task features                    |One feature → test → commit                |
|Leave console.log in production paths  |Gate or remove                             |

-----

## 10. PROMPT ENGINEERING GUIDE (for AI tool handoff)

When generating prompts for **Lovable**, **Cursor**, or **Claude Code** from this repo:

```
Structure:
1. Context block: "This is [feature] in ChravelApp. Stack: React 18 / TypeScript / Supabase / Tailwind."
2. Current behavior: exact description of what exists
3. Desired behavior: exact DoD
4. Constraints: "Do not modify demo mode. Do not add new dependencies. Mobile-first."
5. File references: explicit paths (e.g., src/components/TaskList.tsx)
6. Visual layout: ASCII diagram if UI change
7. Test criteria: how to verify it worked
```

> The single biggest cause of failed Lovable/Cursor prompts is ambiguous file references. Always name the exact component file.

-----

## 11. MCP / TOOL INTEGRATIONS

|Tool              |Purpose                                      |Notes                                          |
|------------------|---------------------------------------------|-----------------------------------------------|
|Supabase MCP      |DB schema access in Claude Code              |Use OAuth method; scope to dev project ref only|
|Vercel MCP        |Deployment management                        |Connected via claude.ai connectors             |
|GitHub repo       |`MeechYourGoals/chravel`                     |Anti-Goldfish: read git log before coding      |
|SuperMemory plugin|Persistent memory across Claude Code sessions|Claude Code only, not claude.ai web            |

**Supabase MCP setup (if needed):**

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp?project_ref=YOUR_DEV_PROJECT_REF
```

Verify with `/mcp` inside Claude Code, then test: *"What tables are in the database? Use MCP tools."*

-----

## 12. SESSIONS THAT SHOULD BECOME REUSABLE SKILLS

Based on recurring patterns in this project, the following should be templated (not re-invented each session):

|Pattern                                 |Recommended format                                                                    |
|----------------------------------------|--------------------------------------------------------------------------------------|
|Lovable/Cursor prompt engineering       |Prompt template with the 7-section structure above                                    |
|Mobile swipe/gesture bug fixes          |Checklist: check transform, swipe container structure, translate vs clip              |
|Navigation bar / routing inconsistencies|Checklist: check conditional rendering per-route, shared vs per-page header components|
|Field name mismatch debugging           |Checklist: trace DB → client type → hook → prop → render                              |
|MCP setup troubleshooting               |Decision tree: OAuth vs PAT, scope, version mismatch                                  |
|PRD → agency handoff                    |Template: 5-phase structure with hour estimates, AI vs human task split               |

-----

## 14. PERSISTENT MEMORY SYSTEM

Chravel uses repo-level persistent memory files so all coding agents (Claude, Cursor, Codex) share the same debug playbook and learning history.

| File | Purpose |
|------|---------|
| `DEBUG_PATTERNS.md` | Recurring bug signatures, root causes, proven fixes |
| `LESSONS.md` | Reusable strategy / recovery / optimization tips |
| `TEST_GAPS.md` | Missing test coverage discovered during work |
| `agent_memory.jsonl` | Structured machine-readable memory entries |

**Protocol:** Read before planning → Execute → Extract learnings → Write back. See `CLAUDE.md § AGENT LEARNING PROTOCOL` for full rules.

**Memory file creation:** If a file doesn't exist and the current task generates information appropriate for it, create it using the schema defined in CLAUDE.md. Do not create empty placeholders.

**Deduplication:** Before appending, check if an equivalent entry exists. Merge and refine rather than duplicate. Prefer improving specificity over adding volume.

-----

## 15. KEEP THIS FILE LEAN

- Max target: ~8KB
- If content exceeds ~30 lines on a topic → move to `/docs/<topic>.md` and link here
- This file is the **routing layer** for agent attention, not the encyclopedia

```
/docs/
  supabase-schema.md       → DB types, RLS notes, migration history
  mobile-architecture.md   → Capacitor config, PWA constraints, iOS wrapper
  demo-mode.md             → Mock data architecture, parallel data path pattern
  prompt-engineering.md    → Expanded prompting guide for AI tools
  touring-intel.md         → CAA touring data extraction patterns (separate concern)
```
