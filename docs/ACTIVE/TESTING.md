# Testing Infrastructure

This document describes the enforced testing model for Chravel.

## Quality layers

- **Unit tests (Vitest):** pure business logic, utility functions, adapters.
- **Integration tests (Vitest):** hooks/services/component interactions with mocked boundaries.
- **E2E tests (Playwright):** Tier-0 and selective Tier-1 user journeys.
- **RLS/authorization checks (Playwright + Supabase fixtures):** permission boundaries and policy safety.

## Governance guardrails (required)

The following checks now define the minimum confidence baseline:

1. **Tier-0 journey matrix** → `qa/journeys/tier0.json`
2. **Tier-0 gate validator** → `node scripts/qa/validate-tier0-gate.cjs`
3. **Skipped-test policy** → `node scripts/qa/check-skipped-tests.cjs`
4. **E2E doc drift check** → `node scripts/qa/check-e2e-doc-drift.cjs`

These are bundled via:

```bash
npm run qa:guardrails
```

## Bug-to-regression closure rule

A bug is **not closed** until all of the following are true:

1. Reproduction artifact exists (steps, inputs, environment).
2. A failing test was added at the correct layer.
3. Fix was implemented.
4. Regression test now passes and is linked in PR notes.

## Running tests

```bash
# Static quality checks
npm run lint:check
npm run typecheck
npm run qa:guardrails

# Unit/integration tests
npm run test:run

# End-to-end tests
npm run test:e2e

# Full build confidence
npm run build
```

## Tier-0 release expectation

Tier-0 journeys are launch-blocking. If any mapped Tier-0 file is missing, skipped, or failing, release confidence is insufficient.

## Known temporary debt

Existing skipped tests in critical suites are tracked in `qa/journeys/skip-allowlist.json`. New skipped tests in critical suites are blocked unless allowlisted with an explicit follow-up.
