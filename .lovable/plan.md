

# Phase 1: Fix All Build Errors to Restore Preview

## Root Cause
9 TypeScript build errors across 4 files are blocking compilation. The preview cannot load because the app fails to build.

## Errors and Fixes

### File 1: `src/hooks/useConciergeHistory.ts` (2 errors)

**Error**: `get_concierge_trip_history` RPC not in generated types; cast of return type fails.

**Fix (lines 51-54)**: Change `supabase.rpc(` to `(supabase.rpc as any)(` to bypass the missing type definition.

**Fix (line 64)**: Change `rows as RpcHistoryRow[]` to `rows as unknown as RpcHistoryRow[]` for the intermediate cast.

---

### File 2: `src/hooks/useTripRoles.ts` (3 errors)

**Error 1 (line 53)**: `role.feature_permissions` (type `Json`) cast directly to `FeaturePermissions` fails.
**Fix**: `role.feature_permissions as unknown as TripRole['featurePermissions']`

**Error 2 (line 139)**: `featurePermissions ?? {}` produces `FeaturePermissions | {}` which is not assignable.
**Fix**: `(featurePermissions ?? {}) as TripRole['featurePermissions']`

**Error 3 (line 164)**: `FeaturePermissions` not assignable to `Json` (missing index signature).
**Fix**: `(featurePermissions || null) as any`

---

### File 3: `src/services/tripMediaService.ts` (1 error)

**Error (line 21)**: `item.id` and `item.media_url` are `unknown` (from `Record<string, unknown>`), not assignable to `string`.

**Fix (lines 23-24)**: Cast `item.id as string` and `item.media_url as string`. Same for `filesData` map (line 33): `item.id as string`.

---

### File 4: `src/services/tripService.ts` (3 errors, same root cause)

**Error (lines 340, 378, 429)**: `TRIP_LIST_COLUMNS` select string (line 298) is missing `updated_at`, but the `Trip` interface requires it. All objects spread from those query results lack `updated_at`.

**Fix (line 298)**: Add `updated_at` to the `TRIP_LIST_COLUMNS` string:
```
'id, name, description, start_date, end_date, destination, trip_type, created_at, updated_at, cover_image_url, created_by, is_archived, card_color, organizer_display_name'
```

This single change resolves all 3 errors in this file.

---

## Summary Table

| File | Line(s) | Fix | Risk |
|------|---------|-----|------|
| useConciergeHistory.ts | 51-54, 64 | `as any` on RPC, `as unknown` on result | None -- RPC exists in DB |
| useTripRoles.ts | 53, 139, 164 | `as unknown` intermediate casts for Json/FeaturePermissions | None -- runtime unchanged |
| tripMediaService.ts | 23-24, 33 | `as string` on `item.id`, `item.media_url` | None -- values are strings from DB |
| tripService.ts | 298 | Add `updated_at` to SELECT columns | None -- column exists, was just omitted |

## Phase 2: Comprehensive Debugging Report

After the build fixes are applied and preview loads, I will perform a deep audit of Chat, AI Concierge, Payments, Places, Polls, and Tasks for both regular and pro trips, following the exact output format specified in the request.

