

## Executive Summary

The Lovable preview is broken due to **9+ TypeScript build errors** across client-side hooks and edge functions. The errors stem from today's hardening PRs introducing code that references (1) tables/RPCs not yet in the generated Supabase types, (2) missing imports, and (3) property name mismatches against local interfaces. The edge function errors are secondary (they don't block the frontend build in Lovable's Vite pipeline) — the **primary blockers are the 6 client-side TS errors**.

## Root Cause Analysis

### Category 1: Missing import — `QueryClient` type (App.tsx:114)
- `NativeLifecycleBridge` uses `QueryClient` as a prop type but only imports `QueryClientProvider` and the instance
- **Fix**: Import `QueryClient` type from `@tanstack/react-query`

### Category 2: Missing import + wrong property names — `telemetry` (useAuth.tsx:714-745)
- `telemetry.identify()` and `telemetry.reset()` are called but `telemetry` is never imported
- Properties use snake_case (`display_name`, `is_pro`, `organization_id`, `created_at`) but the `User` interface uses camelCase (`displayName`, `isPro`, `organizationId`)
- `User` interface has no `created_at` property at all
- **Fix**: Import `telemetry` from `@/telemetry/service`, fix property names to match User interface

### Category 3: Supabase types out of sync — tables/RPCs not in generated types
These tables/RPCs were added to the database but `src/integrations/supabase/types.ts` hasn't been regenerated:
- `trip_pending_actions` table → used in `usePendingActions.ts`, `useVoiceToolHandler.ts`
- `get_trip_admin_permissions` RPC → used in `useProTripAdmin.ts`
- `update_task_with_version` RPC → used in `useTripTasks.ts`
- **Fix**: Cast these calls through `(supabase as any)` to unblock the build, since regenerating types requires a separate Supabase types sync

### Category 4: Missing function references (useTripTasks.ts)
- `useMutationPermissions` is used but not imported
- `generateMutationId` is used but not imported
- **Fix**: Add the missing imports

### Category 5: Type mismatch — EntitlementStatus (useUnifiedEntitlements.ts:138)
- Return type declares `status: 'active' | 'trialing' | 'expired' | 'canceled'` but store has `EntitlementStatus` which includes `'past_due'`
- **Fix**: Widen the return type to include `'past_due'` or use `EntitlementStatus` directly

### Category 6: Edge function SupabaseClient generics (calendar-sync, process-account-deletions)
- Edge functions use typed Supabase client but generic inference fails
- **Fix**: Cast supabase client to `any` in edge functions (per existing project convention in memory)

## Ranked Blocking Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | P0 | App.tsx | Missing `QueryClient` type import |
| 2 | P0 | useAuth.tsx | Missing `telemetry` import + wrong property names |
| 3 | P0 | useTripTasks.ts | Missing `useMutationPermissions` + `generateMutationId` imports |
| 4 | P0 | useUnifiedEntitlements.ts | `status` type too narrow (missing `past_due`) |
| 5 | P0 | usePendingActions.ts | `trip_pending_actions` not in Supabase types |
| 6 | P0 | useVoiceToolHandler.ts | `trip_pending_actions` not in Supabase types |
| 7 | P0 | useProTripAdmin.ts | `get_trip_admin_permissions` RPC not in types |
| 8 | P0 | useTripTasks.ts | `update_task_with_version` RPC not in types |
| 9 | P1 | Edge functions | SupabaseClient generic mismatches |

## Fix Plan

**Order**: Fix in dependency order — imports first, then type mismatches, then Supabase type workarounds, then edge functions.

1. **App.tsx** — Add `QueryClient` to the `@tanstack/react-query` import
2. **useAuth.tsx** — Import `telemetry` from `@/telemetry/service`; fix property names to camelCase (`displayName`, `isPro`, `organizationId`); remove `created_at` (not on User type)
3. **useTripTasks.ts** — Add imports for `useMutationPermissions` and `generateMutationId`
4. **useUnifiedEntitlements.ts** — Import and use `EntitlementStatus` type for the `status` field in the return interface
5. **usePendingActions.ts** — Cast `supabase` to `any` for `trip_pending_actions` queries
6. **useVoiceToolHandler.ts** — Cast `supabase` to `any` for `trip_pending_actions` queries
7. **useProTripAdmin.ts** — Cast RPC call through `any`
8. **useTripTasks.ts** — Cast `update_task_with_version` RPC through `any`
9. **Edge functions** — Cast supabase clients to `any` per project convention

All fixes are surgical — no architectural changes removed, no hardening work reverted.

