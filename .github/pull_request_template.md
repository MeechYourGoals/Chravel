## Summary

<!-- What does this PR do and why? Keep it concise. -->

## Changes

<!-- Bullet list of concrete changes. -->

-

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to break)
- [ ] Refactor (no functional change)
- [ ] Chore (dependency update, config change, docs, etc.)

## Deploy Impact

- [ ] **Database migration included** — migration is idempotent and backward-compatible
- [ ] **Edge function changes** — functions tested locally with `supabase functions serve`
- [ ] **Environment variable added/changed** — `.env.example` updated, Vercel/Supabase secrets configured
- [ ] **Feature flag change** — flag documented and reversible
- [ ] **None of the above** — code-only change

## Pre-Merge Checklist

- [ ] `npm run lint && npm run typecheck && npm run build` passes locally
- [ ] No `console.log` left in committed code
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No weakening of RLS or auth guarantees
- [ ] Existing tests pass; new tests added where appropriate
- [ ] Loading, empty, and error states handled (not conflated)
- [ ] Mobile-safe layout (no overflow regressions)

## Testing

<!-- How was this tested? Manual steps, automated tests, screenshots? -->

## Rollback Plan

<!-- What happens if this breaks in production? Can we revert cleanly? -->
<!-- If a migration is included: rollback = forward-fix. Describe the forward-fix. -->
