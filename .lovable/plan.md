

# Fix: Trip Creation "Failed to fetch" / "No authenticated user" Errors

## Root Cause Analysis

Two issues are causing trip creation failures:

1. **Edge Function Deployment Stale**: The `create-trip` edge function shares `_shared/validation.ts` which was recently updated (added `category` enum to `CreateTripSchema`). The deployed function may be running an older version that doesn't match the current code. Edge function logs show zero entries, suggesting requests may be failing at the infrastructure level before reaching the function handler.

2. **CORS Headers Too Restrictive**: The shared `_shared/cors.ts` CORS configuration only allows 4 headers (`authorization, x-client-info, apikey, content-type`). Newer Supabase JS client versions may send additional headers. If a preflight OPTIONS request includes headers not in the allow list, the browser blocks the actual request entirely, producing the generic "Failed to fetch" error.

The "No authenticated user" error is a secondary symptom -- it comes from `tripService.ts` line 131 where `supabase.auth.getUser()` returns null. This can happen when sessions are briefly invalid or when the auth state hasn't fully initialized before the mutation fires.

## Changes

### 1. Update CORS Headers (`supabase/functions/_shared/cors.ts`)

Add all Supabase client headers to the allow list to prevent preflight rejections:

- Current: `authorization, x-client-info, apikey, content-type`
- Updated: `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`

This also updates the legacy `corsHeaders` export to match.

### 2. Harden Auth Check in `tripService.ts`

Add a session refresh fallback before throwing "No authenticated user":

- If `getUser()` returns null, attempt `getSession()` as a recovery step
- If the session exists but `getUser()` fails, refresh the session before giving up
- This handles edge cases where the auth token is briefly stale

### 3. Redeploy the `create-trip` Edge Function

Force a fresh deployment to ensure the function runs the latest `_shared/validation.ts` and `_shared/cors.ts` code.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/_shared/cors.ts` | Expand `Access-Control-Allow-Headers` to include additional Supabase client headers |
| `src/services/tripService.ts` | Add session refresh fallback in `createTrip` before throwing auth error |

## No Regressions

- CORS change is additive (more permissive, not less) -- all existing requests continue to work
- Auth fallback only adds a retry path, never removes existing behavior
- Group, Pro, and Event trip creation all use the same `createTrip` path, so the fix applies universally
- The `CreateTripSchema` validation remains backward compatible (`category` is optional)

