
# Admin Dashboard Redesign + Per-Tab Permissions + Build Error Fixes

## Summary

Redesign the Admin dashboard to replace "Event Visibility" with a clean "Visibility" toggle in the Permissions slot, remove the Permissions card entirely, and add gear icons on Chat and Media tab rows that open permission modals. Also fix all 13 build errors across 7 files.

---

## Part 1: Fix All Build Errors (7 files, 13 errors)

### Edge Function Errors (2 files, 2 errors)

**`supabase/functions/gemini-voice-session/index.ts` line 65**
- Add explicit type: `.some((row: any) => ...)`

**`supabase/functions/generate-embeddings/index.ts` line 239**
- Already has `(doc: any)` -- the issue is that the `Map` constructor doesn't infer the value type. Change to `new Map<string, any>(docs.map(...))`.

### Frontend Errors (5 files, 11 errors)

**`src/utils/paidAccess.ts` line 9**
- `PaidAccessStatus` is missing `'cancelled'`. The `ConsumerSubscription` type in `consumer.ts` includes `'cancelled'` but `PaidAccessStatus` only has `'inactive'`. Add `'cancelled'` to the union: `'active' | 'trial' | 'expired' | 'inactive' | 'cancelled'`

**`src/components/events/LineupImportModal.tsx` lines 250, 252**
- The `state` type is `ImportState = 'idle' | 'parsing' | 'preview' | 'importing'` but the comparisons happen inside a block that already narrowed state to `'preview'`. This means `state === 'importing'` is flagged as impossible. Fix: use a local variable or widen the comparison.

**`src/hooks/useEventLineup.ts` lines 211, 216, 243, 255**
- Line 211: The `.map()` returns `string[][]` but `new Map()` expects `[K, V][]` tuples. Fix: add `as [string, string]` cast to the map return.
- Line 216: `.localeCompare()` on `unknown`. Fix: type the `.values()` result or cast.
- Line 243: `.toLocaleLowerCase()` on `unknown`. Same fix.
- Line 255: `name: unknown` not assignable to `name: string`. Same root cause.

**`src/utils/__tests__/lineupImportParsers.test.ts` lines 24, 44, 58**
- `InvokeResult` type has `error: { message: string } | null` which doesn't match `FunctionsResponseSuccess` expecting `error: null`. Fix: change the mock return type assertion or widen the `InvokeResult` interface to match.

---

## Part 2: Database Migration

Add two columns to the `trips` table:

```sql
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS chat_mode text NOT NULL DEFAULT 'broadcasts'
    CHECK (chat_mode IN ('broadcasts', 'admin_only', 'everyone')),
  ADD COLUMN IF NOT EXISTS media_upload_mode text NOT NULL DEFAULT 'admin_only'
    CHECK (media_upload_mode IN ('admin_only', 'everyone'));
```

No new tables needed. These columns store per-event permission settings. RLS on `trips` already restricts updates to admins/creators.

---

## Part 3: Admin Dashboard UI Redesign

### `src/components/events/EventAdminTab.tsx` -- full rewrite of Row 1

**Before (3 columns):**
```
[Admin Dashboard] [Event Visibility] [Permissions (Coming Soon)]
```

**After (2 columns):**
```
[Admin Dashboard + Visibility toggle] [removed]
```

Changes:
- Remove the center "Event Visibility" card and right "Permissions" card entirely
- Move Visibility into the Admin Dashboard header row as a compact segmented control or labeled switch showing "Public" / "Private"
- Microcopy below: "Anyone with the link can join." or "Join requests required."
- No truncation issues since text is much shorter

### Tabs card -- add gear icons for Chat and Media

In the tab list (Row 2 left card), add a small `Settings2` (gear) icon button on the right side of the Chat and Media rows, next to their toggle switches.

Clicking the gear opens a `Dialog` modal:

**Chat gear modal:**
- Title: "Chat permissions"
- 3 radio options with descriptions (as specified)
- Save / Cancel buttons
- Default: "broadcasts"

**Media gear modal:**
- Title: "Media upload permissions"
- 2 radio options with descriptions (as specified)
- Default: "admin_only"

### `src/hooks/useEventAdmin.ts` -- extend

- Fetch `chat_mode` and `media_upload_mode` from the trips query (add to select)
- Add `chatMode` and `mediaUploadMode` to return values
- Add `setChatMode(mode)` and `setMediaUploadMode(mode)` mutation functions with optimistic updates

---

## Part 4: Server-Side Enforcement (future edge function updates)

The plan adds DB columns with CHECK constraints. Server-side enforcement of chat/media modes in the actual chat and media upload flows will be addressed in a follow-up since those flows live in separate components and edge functions. The DB columns + admin UI are the foundation.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/gemini-voice-session/index.ts` | Add `any` type to `.some` callback |
| `supabase/functions/generate-embeddings/index.ts` | Type `Map` generic |
| `src/utils/paidAccess.ts` | Add `'cancelled'` to `PaidAccessStatus` |
| `src/components/events/LineupImportModal.tsx` | Fix narrowed type comparisons |
| `src/hooks/useEventLineup.ts` | Add tuple types to Map constructor + cast values |
| `src/utils/__tests__/lineupImportParsers.test.ts` | Fix mock return type |
| DB migration | Add `chat_mode` + `media_upload_mode` columns to `trips` |
| `src/hooks/useEventAdmin.ts` | Fetch + mutate chat_mode and media_upload_mode |
| `src/components/events/EventAdminTab.tsx` | Redesign layout: move visibility, remove permissions card, add gear modals |

## Implementation Order

1. Fix all 13 build errors across 7 files
2. Run DB migration (add 2 columns)
3. Extend `useEventAdmin` hook
4. Rewrite `EventAdminTab` UI
5. Deploy updated edge functions
