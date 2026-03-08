

## Build Error Assessment — Current State

### Result: No Active Build Errors

After thorough analysis of the codebase, **there are no current build-blocking errors**. The two previously reported issues were already resolved in the last conversation:

1. **`supabase/functions/join-trip/index.ts`** — Missing `applyRateLimit` import → **Fixed** (line 10 now imports from `../_shared/rateLimitGuard.ts`)
2. **`supabase/functions/gmail-import-worker/index.ts`** — `logMessage` client type resolving to `never` → **Fixed** (parameter typed as `any` on line 145)

### Non-Blocking Issues Worth Noting (Not Build Errors)

These won't break builds but are worth tracking:

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `src/services/broadcastService.ts:221-239` | RPC calls use `broadcast_uuid` param but DB functions expect `p_broadcast_id` / `p_user_id` — runtime error, suppressed by `@ts-ignore` | **Runtime bug** |
| 2 | `src/services/googlePlacesNew.ts` (4 locations) | `@ts-ignore` for Google Maps Places API methods not in `@types/google.maps` yet | Cosmetic |
| 3 | `src/telemetry/providers/sentry.ts`, `posthog.ts` | `@ts-expect-error` for optional dependencies that may not be installed | Intentional |
| 4 | 64 `@ts-ignore`/`@ts-expect-error` suppressions across 7 files | Technical debt — some are valid, the broadcast ones mask real bugs | Low |

### Recommended Fix (if desired)

The **broadcast RPC parameter mismatch** (item #1) is a real runtime bug that would silently fail. The fix:
- Change `broadcast_uuid` → `p_broadcast_id` in both RPC calls
- Add `p_user_id: user.id` to the `mark_broadcast_viewed` call

This is a 2-line surgical fix, no UI/UX impact.

