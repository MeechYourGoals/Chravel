

# Fix OG Preview Deploy Failure: Inline Ternary Syntax in Edge Function

## Problem
The `generate-invite-preview` edge function fails to deploy because the Deno bundler chokes on nested ternary expressions with single-quoted hex colors inside CSS template literals.

Three problematic lines in `supabase/functions/generate-invite-preview/index.ts`:
- **Line 471:** `.badge` -- `color: ${isEvent || isPro ? '#fff' : '#000'};`
- **Line 494:** `.dates` -- `color: ${isEvent && trip.themeColor ? trip.themeColor : '#a855f7'};`
- **Line 518:** `.cta` -- `color: ${isEvent || isPro ? '#fff' : '#000'};`

The `generate-trip-preview` function does NOT have this issue (its CSS uses hardcoded values, no inline ternaries).

## Fix (generate-invite-preview/index.ts only)

**Step 1:** Add two pre-computed variables before the `return` statement in `generateInviteHTML` (around line 421, after `badgeText`):

```ts
const badgeTextColor = isEvent || isPro ? '#fff' : '#000';
const datesColor = isEvent && trip.themeColor ? trip.themeColor : '#a855f7';
```

**Step 2:** Replace the three inline ternaries in the CSS template:

| Line | Before | After |
|------|--------|-------|
| 471 | `color: ${isEvent \|\| isPro ? '#fff' : '#000'};` | `color: ${badgeTextColor};` |
| 494 | `color: ${isEvent && trip.themeColor ? trip.themeColor : '#a855f7'};` | `color: ${datesColor};` |
| 518 | `color: ${isEvent \|\| isPro ? '#fff' : '#000'};` | `color: ${badgeTextColor};` |

**Logic is identical** -- we're just pre-computing values so the bundler doesn't parse ternaries inside the template literal.

## Deployment

After the code fix, both functions will be auto-deployed by Lovable to the connected Supabase project. The `config.toml` already has `verify_jwt = false` for both functions, which is correct (crawlers like iMessage don't send auth tokens).

## Verification

After deploy, test with:
1. Direct URL: `https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-invite-preview?code=demo-1-12345` -- should return HTML with `og:image` and `og:title`
2. Direct URL: `https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-trip-preview?tripId=1` -- should return HTML with OG tags
3. Send a link in iMessage to confirm the rich card (cover photo, title, location, dates) appears

## Risk Assessment
- **Regression Risk: LOW** -- zero logic changes, only variable extraction
- **Rollback:** Revert the 3-line variable extraction

## Technical Details
- Files changed: `supabase/functions/generate-invite-preview/index.ts` (1 file, ~5 lines changed)
- No database changes
- No new dependencies
- No auth/routing/RLS impact
