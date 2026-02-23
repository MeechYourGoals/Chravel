
# Fix Plan: Event Detail Issues (4 Items)

## Issue 1: Event Team shows "Trip Creator" instead of real name

**Root cause:** In `src/hooks/useTripMembers.ts` (lines 129-141), when the creator is missing from the `trip_members` table, a fallback member is created. If the profile lookup returns `null` (e.g., timing issue, RLS, or the `profiles_public` view not returning data), the fallback uses `"Trip Creator"` as the `display_name` and `resolved_display_name`.

**Fix:** The profile fetch at line 123-127 uses `.maybeSingle()` which can silently return null. We need to:
1. Add a retry or broader fallback using the `useAuth` user profile data when the `profiles_public` query returns null for the current user.
2. Additionally, in `EventDetail.tsx` (line 181-185), when mapping `tripMembers` to participants, the `name` field is already set from `useTripMembers` output -- so the root fix must be in `useTripMembers.ts` to ensure the creator profile is resolved properly.
3. Use `getEffectiveDisplayName` from `resolveDisplayName.ts` as an additional fallback when the profile query returns null but the user is the current authenticated user (their auth metadata likely has their name).

**Files to modify:**
- `src/hooks/useTripMembers.ts` -- improve creator profile fallback logic

---

## Issue 2: Event Team section shows count "1" but no avatar/chip initially

**Root cause:** In `src/components/TripHeader.tsx` (line 642), the skeleton is only shown when `isMembersLoading && mergedParticipants.length === 0`. However, the `trip.participants` array passed from `EventDetail.tsx` depends on `tripMembers` from `useTripMembers`, which is initially empty (`[]`). When `isMembersLoading` becomes false but participants is still empty briefly (race condition), the `CollaboratorsGrid` renders with 0 items while the count shows `Math.max(mergedParticipants.length, trip.created_by ? 1 : 0)` = 1.

**Fix:** Ensure the skeleton/loading state persists until `tripMembers` is actually populated. The `isMembersLoading` prop from `EventDetail.tsx` should accurately reflect the loading state. Verify that `membersLoading` from `useTripMembers` is passed through to `TripHeader` as `isMembersLoading`.

**Files to modify:**
- `src/pages/EventDetail.tsx` -- verify `isMembersLoading={membersLoading}` is passed to TripHeader

---

## Issue 3: Agenda right panel (files) loading spinner takes too long

**Root cause:** In `src/hooks/useEventAgendaFiles.ts`, the `loadFiles` function calls `supabase.storage.from('trip-media').list(prefix, ...)`. For a brand-new event with no files, the storage folder may not exist yet, causing the Supabase Storage API to take longer or return an error that's caught silently. The spinner at line 650-654 of `AgendaModal.tsx` shows indefinitely during this time.

**Fix:**
1. In `useEventAgendaFiles.ts`, add a timeout or fast-path: if the storage list returns empty or an error for a new event, resolve quickly rather than hanging.
2. Ensure `isLoading` is set to `false` promptly even on edge cases (the current code already does this, so the real issue may be the storage API latency). Add a `AbortController` timeout of ~5 seconds as a safeguard.

**Files to modify:**
- `src/hooks/useEventAgendaFiles.ts` -- add timeout safeguard and ensure fast resolution for empty/new events

---

## Issue 4: "Add Task" button is golden with black text -- should match tab pill design

**Root cause:** In `src/components/events/EventTasksTab.tsx` (line 215), the Add Task button uses:
```
className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
```
This is a solid gold button, violating the design language where sub-tab action buttons should use the `ActionPill` component with `manualOutline` variant (black bg, white border, white text, matching the tab pill dimensions: `min-h-[42px]`, `rounded-xl`, `text-sm`, `font-medium`).

**Fix:** Replace the `<Button>` with an `<ActionPill variant="manualOutline">` component, matching how CalendarHeader does it. This gives it the black background, white text/border, same height and border-radius as the "Tasks" tab above.

Also fix the submit button inside the Add Task form (line 253) which has the same gold styling -- this one can remain gold since it's a form submit CTA inside a card, not a sub-tab action button.

**Files to modify:**
- `src/components/events/EventTasksTab.tsx` -- replace Add Task header button with ActionPill

---

## Technical Summary

| # | Issue | File(s) | Change |
|---|-------|---------|--------|
| 1 | "Trip Creator" instead of real name | `useTripMembers.ts` | Improve creator profile fallback using auth user data |
| 2 | Team section empty despite count=1 | `EventDetail.tsx` | Ensure `membersLoading` is properly threaded to TripHeader |
| 3 | Agenda files panel slow loading | `useEventAgendaFiles.ts` | Add timeout safeguard for storage API calls |
| 4 | Add Task button gold instead of pill | `EventTasksTab.tsx` | Replace Button with ActionPill manualOutline variant |
