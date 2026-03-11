---
name: chravel-prd
description: Create a Product Requirements Document (PRD) for a Chravel feature. Produces structured markdown with user stories, acceptance criteria, and Chravel-specific technical approach. Triggers on "write a PRD", "create PRD", "plan feature", "new feature spec", "product requirements for".
disable-model-invocation: true
---

# Chravel PRD Skill

Generate detailed Product Requirements Documents for Chravel features.

## When to Use

When planning a new feature before implementation. Produces a structured PRD at `tasks/prd-[feature-name].md`.

## Workflow

### 1. Gather Information

Ask clarifying questions conversationally:
1. **What problem does this solve?** — user pain point or gap
2. **Who is the target user?** — consumer traveler, pro/business, organizer, admin?
3. **What's the scope?** — MVP vs full feature
4. **Which Chravel systems does it touch?** — trips, chat, payments, calendar, AI concierge, smart import?
5. **Any existing patterns?** — Components, hooks, or flows to follow
6. **Success criteria?** — How we know it works

### 2. Generate the PRD

Create `tasks/prd-[feature-name].md`:

```markdown
# PRD: [Feature Name]

## Overview
Brief description and purpose.

## Problem Statement
What user problem does this solve? Why now?

## Target Users
Consumer traveler / Pro business / Trip organizer / Admin

## Goals
- Goal 1
- Goal 2

## Non-Goals
- What this feature will NOT do

## User Stories

### US-001: [Story Title]
**As a** [user type]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Technical Notes:**
- Files to modify
- Supabase tables/RLS involved
- Chravel patterns to follow

---

## Technical Approach
- Stack: React 18 + TypeScript + Supabase + Tailwind
- State: TanStack Query + Zustand
- Feature folder: src/features/[name]/
- Design: Dark/gold design language (see chravel-design-language skill)

## Dependencies
- Supabase tables, RLS policies
- External APIs (Gemini, RevenueCat, etc.)

## Chravel-Specific Concerns
- Mobile/PWA parity requirements
- Offline behavior
- Auth gating
- RLS implications
- Trip Not Found regression risk
- Performance budget

## Success Metrics
How we measure success.
```

### 3. Story Guidelines

Each user story should be:
- **Small** — completable in one Claude Code session (~30 min)
- **Independent** — no dependency on incomplete stories
- **Testable** — clear acceptance criteria
- **Ordered** — dependencies flow correctly (schema → API → UI)

### 4. Next Steps

After PRD creation:
```
PRD saved to tasks/prd-[feature-name].md

To convert to Ralph format for autonomous development:
1. Say: "Convert tasks/prd-[feature-name].md to ralph format"
2. Then run: ./scripts/ralph/ralph.sh
```
