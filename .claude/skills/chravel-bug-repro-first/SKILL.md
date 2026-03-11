---
name: chravel-bug-repro-first
description: Chravel-specific bug reproduction workflow. Reproduce bugs in the Chravel codebase before fixing them, with awareness of Chravel's critical paths, common regressions, and testing infrastructure. Triggers on "bug in chravel", "chravel regression", "trip loading bug", "auth bug", "reproduce this chravel bug".
---

# Chravel Bug Reproduction First

Reproduce Chravel bugs before fixing them. Chravel-specific awareness built in.

## Chravel Bug Classification

### Critical Path Bugs (HIGHEST PRIORITY)
- Trip loading failures ("Trip Not Found" for valid trips)
- Auth flow breaks (login/logout/session issues)
- Payment mutations (wrong charges, missing balance updates)
- Chat delivery (messages not appearing, duplicates)
- RLS violations (data access beyond authorization)

### Feature Bugs
- AI Concierge response issues
- Smart Import parsing failures
- Calendar event creation/display
- Invite/join flow problems
- Media upload failures

### UI/UX Bugs
- Mobile layout breakage
- Design language violations
- Empty state missing guidance
- Loading state missing or flashing error

## Reproduction Protocol

### 1. Classify
- Which critical path does this touch?
- Is this a known regression class? (see `chravel-no-regressions` skill)
- What's the blast radius?

### 2. Write the Test
Choose the right test level:
- **Unit:** Pure function bugs, type mismatches, calculation errors
- **Hook test:** useAuth, useTrip, useBalanceSummary behavior
- **Component test:** Render logic, conditional display, event handling
- **Integration:** Multi-layer flows (auth → fetch → render)

Test must fail for the CORRECT reason:
- Not a setup issue
- Not a missing mock
- Not an unrelated error
- Fails because the actual bug behavior is reproduced

### 3. Verify Reproduction Quality
- Does the test fail consistently (not flaky)?
- Does the test isolate the bug (not testing 10 things)?
- Would fixing the bug make this test pass?
- Is the test at the right level (not too high, not too low)?

### 4. Diagnose
With the reproduction test in hand:
- Trace the data/state flow through Chravel's layers
- Check: Supabase query → RLS → hook → component → render
- Check: Auth state → guard → data fetch timing
- Check: Realtime subscription → state update → UI refresh

### 5. Fix and Prove
- Smallest correct fix
- Reproduction test passes
- No regressions in related critical paths
- Build passes: `npm run lint && npm run typecheck && npm run build`

## Chravel Testing Infrastructure

- Test files: `src/components/__tests__/`, `src/types/__tests__/`, `src/lib/__tests__/`
- Test runner: Check `package.json` for test command
- Hook testing: Use `@testing-library/react-hooks` patterns
- Component testing: Use `@testing-library/react` patterns
