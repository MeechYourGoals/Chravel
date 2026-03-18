

# Forensic Audit & Fix Plan

## Executive Summary

The app is blocked by **10 TypeScript build errors** across 3 files. These are all type-level incompatibilities — no runtime logic is broken. The build pipeline fails before producing output, so **all environments** (Lovable, Vercel, Render, IONOS, PWA) are equally affected since none can serve a built app.

**Primary root cause:** Recent calendar service refactoring introduced a `TripEvent` domain type with `source_data: Record<string, unknown> | null`, but the Supabase-generated type uses `source_data: Json | null` where `Json = string | number | boolean | null | {...} | Json[]`. These are structurally incompatible in both directions. Additionally, the `update_event_with_version` RPC is referenced in code but missing from the generated Supabase types, and the `calendarOfflineQueue` passes a plain `string` status where a union literal is expected.

**This is a single root cause class:** type mismatches between domain types and Supabase generated types, compounded by a missing RPC in the type file. All 10 errors stem from this.

## Findings Table

| ID | Area | Issue | Severity | Blocks Build? | Fix Type |
|----|------|-------|----------|---------------|----------|
| 1 | Edge Function | `f` implicitly `any` in `process-account-deletions` line 165 | High | Y | Code (add type annotation) |
| 2 | calendarOfflineQueue.ts:94 | `status: string` not assignable to `'failed' | 'pending' | 'syncing'` | High | Y | Code (use `as const` or type the literal) |
| 3-6 | calendarService.ts:272,330,363 | `Json` not assignable to `Record<string, unknown>` (Supabase Row → TripEvent) | High | Y | Code (cast `source_data`) |
| 7 | calendarService.ts:435 | `update_event_with_version` RPC not in generated types | High | Y | Code (`as any` cast, per project convention) |
| 8 | calendarService.ts:491 | `Record<string, unknown>` not assignable to `Json` (TripEvent → Supabase Update) | High | Y | Code (cast `source_data`) |
| 9 | calendarService.ts:802 | Same as #3-6 (Json → Record) | High | Y | Code (cast) |
| 10 | calendarService.ts:153,850 | `CreateEventData`/`TripEvent` not assignable to `Record<string, unknown>` (index signature missing) | High | Y | Code (cast) |

## Fix Plan (3 files, minimal surgical casts)

### File 1: `supabase/functions/process-account-deletions/index.ts` (line 165)
Add explicit type to the `.map` callback parameter:
```typescript
const filePaths = files.map((f: { name: string }) => `${userId}/${f.name}`);
```

### File 2: `src/services/calendarOfflineQueue.ts` (line 86-88)
Type the `status` field as a literal:
```typescript
const filters: { status?: 'failed' | 'pending' | 'syncing'; entityType?: SyncEntityType; tripId?: string } = {
  status: 'failed' as const,
  entityType: 'calendar_event',
};
```

### File 3: `src/services/calendarService.ts` (multiple locations)
All errors are `Json ↔ Record<string, unknown>` mismatches and the missing RPC. Apply targeted casts:

1. **Lines returning Supabase rows as `TripEvent[]`** (~272, 330, 363, 802): Cast with `as unknown as TripEvent` or `as TripEvent[]` at the return/assignment point.
2. **Line 435** (`update_event_with_version` RPC): Use `(supabase as any).rpc(...)` per project convention for missing RPC types.
3. **Lines 153, 491, 850** (passing domain objects where `Record<string, unknown>` or Supabase Update type expected): Cast with `as Record<string, unknown>` or `as any`.

### What NOT to touch
- No routing, auth, provider, env, or config changes
- No Supabase migrations needed
- No Edge Function redeployment needed (beyond the type fix)
- No external dashboard changes needed
- No secrets or env vars missing

### Why this fixes all environments
The build fails before producing any output. Once these 10 type errors are resolved, the build succeeds and all environments serve the same working bundle.

### Regression risk
Minimal — all changes are type-level casts that don't alter runtime behavior. The actual data flowing through these paths is already compatible at runtime; only the TypeScript compiler disagrees.

