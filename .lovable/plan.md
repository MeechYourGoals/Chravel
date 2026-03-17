

## Root Cause

All 9 build errors are **TS2345 type mismatches in edge functions only** — the Lovable build pipeline type-checks edge functions and fails before the frontend can be served.

The issue: helper functions in `calendar-sync/index.ts` and `process-account-deletions/index.ts` use `ReturnType<typeof createClient>` as the type for the `supabase` parameter. The `createClient()` call returns `SupabaseClient<any, "public", any>`, but `ReturnType<typeof createClient>` resolves to `SupabaseClient<unknown, never, GenericSchema>`. These don't match → TS2345.

This is a known pattern documented in project memory (`supabase-type-inference-workarounds`): "Supabase client instances in complex workers must be cast to `any`."

No client-side code is broken. The preview fails purely because edge function type errors block the build.

## Fix Plan (2 files, minimal changes)

### File 1: `supabase/functions/calendar-sync/index.ts`

Change `supabase` parameter type from `ReturnType<typeof createClient>` to `any` in all 4 helper functions:
- `createEvent` (line 96)
- `getEvents` (line 134)
- `updateEvent` (line 163)
- `deleteEvent` (line 222)

### File 2: `supabase/functions/process-account-deletions/index.ts`

Change `supabase` parameter type from `ReturnType<typeof createClient>` to `any` in:
- `cleanupStorageBucket` (line 141)
- `processAccountDeletion` (line 184)

This resolves all 9 errors. No client-side changes needed. No external config changes required.

## What NOT to touch
- No client code changes
- No routing/provider/auth changes
- No env var changes
- No Supabase config changes

## Regression risk
Minimal — changing typed parameters to `any` only relaxes compile-time checks in these two edge functions. Runtime behavior is identical.

