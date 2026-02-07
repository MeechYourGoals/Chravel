
# Fix Agenda & Lineup Persistence + Lineup Session Detail Modal

## Problem Summary

Three critical issues:

1. **Agenda sessions don't persist** -- Both `AgendaModal.tsx` (desktop) and `EnhancedAgendaTab.tsx` (mobile) save sessions to `useState` only. The `event_agenda_items` database table exists with full RLS policies, but the UI never reads from or writes to it.

2. **Lineup entries don't persist** -- There is no database table for lineup members. They exist only in React state (lifted to parent via `useState`). On page refresh, they vanish.

3. **Lineup click shows edit form** -- Clicking a person in the Lineup should open a read-only modal showing all agenda sessions they appear in, not an editable form.

---

## Part 1: Create `event_lineup_members` Database Table

**New Migration**

```sql
CREATE TABLE IF NOT EXISTS event_lineup_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  company text,
  bio text,
  avatar_url text,
  performer_type text DEFAULT 'speaker',
  created_by uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_lineup_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching event_agenda_items pattern)
CREATE POLICY "Event members can view lineup"
  ON event_lineup_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = event_lineup_members.event_id
    AND trip_members.user_id = auth.uid()
  ));

CREATE POLICY "Event admins can insert lineup"
  ON event_lineup_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = event_lineup_members.event_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'admin')
    OR EXISTS (SELECT 1 FROM trip_admins
      WHERE trip_admins.trip_id = event_lineup_members.event_id
      AND trip_admins.user_id = auth.uid())
  );

CREATE POLICY "Event admins can update lineup"
  ON event_lineup_members FOR UPDATE
  USING ( /* same admin check */ );

CREATE POLICY "Event admins can delete lineup"
  ON event_lineup_members FOR DELETE
  USING ( /* same admin check */ );
```

---

## Part 2: Wire Agenda Sessions to Supabase

### File: `src/components/events/AgendaModal.tsx`

**Load sessions from DB on mount:**
- Add `useEffect` that calls `supabase.from('event_agenda_items').select('*').eq('event_id', eventId)` on mount
- Populate `sessions` state from DB results (fallback to `initialSessions` for demo mode)
- Import `supabase` client and `useAuth` hook

**Save session to DB:**
- In `handleSaveSession`, after validation:
  - If editing: call `.update()` on the existing row
  - If adding: call `.insert()` with `event_id: eventId` and `created_by: user.id`
  - On success, refetch sessions from DB (or optimistically update state)

**Delete session from DB:**
- In `handleDeleteSession`: call `.delete().eq('id', sessionId)` then update local state

### File: `src/components/events/EnhancedAgendaTab.tsx`

Same pattern:
- Load from `event_agenda_items` on mount
- Insert/update/delete against the DB
- Map the local `AgendaSession` type to match the DB schema (align field names: `time` becomes `start_time`, `endTime` becomes `end_time`)

---

## Part 3: Wire Lineup to Supabase

### File: `src/components/events/LineupTab.tsx`

**Load lineup from DB on mount:**
- Add `useEffect` to fetch from `event_lineup_members` where `event_id = tripId`
- Pass `eventId` as a new required prop (currently missing)

**Save to DB on add/edit/delete:**
- `handleAddMember`: insert into `event_lineup_members`
- `handleUpdateMember`: update the row
- `handleDeleteMember`: delete the row

**Auto-populate from agenda speakers:**
- When `AgendaModal` or `EnhancedAgendaTab` calls `onLineupUpdate` with new speakers, the parent (`EventDetailContent` / `MobileTripTabs`) will insert those new names into `event_lineup_members` via Supabase, then the `LineupTab` will refetch or the parent will pass the updated list

### Files: `src/components/events/EventDetailContent.tsx` and `src/components/mobile/MobileTripTabs.tsx`

- Replace the `useState<Speaker[]>` for lineup with a proper Supabase query (or a custom hook)
- The `onLineupUpdate` callback from agenda components will now insert new speakers into `event_lineup_members` in the DB
- Pass `eventId` to `LineupTab`

---

## Part 4: Create `useEventAgenda` and `useEventLineup` Hooks

To keep the components clean, create two reusable hooks:

### `src/hooks/useEventAgenda.ts`
- Fetches agenda items from `event_agenda_items` for a given `eventId`
- Provides `addSession`, `updateSession`, `deleteSession` mutations
- Uses TanStack Query for caching and refetch
- Returns `{ sessions, isLoading, addSession, updateSession, deleteSession }`

### `src/hooks/useEventLineup.ts`
- Fetches lineup members from `event_lineup_members` for a given `eventId`
- Provides `addMember`, `updateMember`, `deleteMember`, `addMembersFromAgenda` mutations
- `addMembersFromAgenda` handles deduplication: checks existing names before inserting
- Returns `{ members, isLoading, addMember, updateMember, deleteMember, addMembersFromAgenda }`

---

## Part 5: Lineup Session Detail Modal (Read-Only)

### File: `src/components/events/LineupTab.tsx`

Replace the current click behavior (which opens an editable form) with a **read-only session detail modal**:

**When a person's card is clicked:**
1. Open a modal showing the person's name, title, company, and bio at the top
2. Below that, show a "Sessions" section with all agenda sessions where their name appears in the `speakers` array
3. Each session card displays: session title, date, start/end time, location, and category -- all read-only
4. The modal has only a close button (X) -- no edit fields

**How to find matching sessions:**
- Accept the full `sessions` list as a prop (from the agenda data already loaded by the parent)
- Filter sessions where `session.speakers?.includes(selectedPerson.name)` (case-insensitive)
- If no sessions found, show "No scheduled sessions" message

**Modal layout:**
```text
+-----------------------------------+
|  [Avatar] Person Name          [X]|
|  Title                            |
|  Company                          |
|                                   |
|  Bio text...                      |
|                                   |
|  --- Sessions (2) ---             |
|                                   |
|  [Card] Session Title             |
|  Jan 15 -- 2:00 PM - 3:30 PM     |
|  Location: Main Stage             |
|  Category: Keynote                |
|                                   |
|  [Card] Session Title 2           |
|  Jan 16 -- 10:00 AM - 11:00 AM   |
|  Location: Room 201               |
|  Category: Workshop               |
+-----------------------------------+
```

**Keep the edit/delete buttons** as hover overlays on the cards (for admin users), but clicking the card itself opens this read-only detail modal, not an edit form.

---

## Part 6: Pass Sessions to LineupTab

Both `EventDetailContent.tsx` and `MobileTripTabs.tsx` need to pass the agenda sessions to `LineupTab` so it can display them in the detail modal:

- Add `agendaSessions` prop to `LineupTab`
- Parent components fetch sessions via `useEventAgenda` hook and pass them down
- This avoids the LineupTab making a separate DB query for the same data

---

## Summary of All Files

| File | Change |
|------|--------|
| New migration SQL | Create `event_lineup_members` table with RLS |
| `src/hooks/useEventAgenda.ts` (NEW) | TanStack Query hook for agenda CRUD against Supabase |
| `src/hooks/useEventLineup.ts` (NEW) | TanStack Query hook for lineup CRUD against Supabase |
| `src/components/events/AgendaModal.tsx` | Replace `useState` with `useEventAgenda` hook; DB persistence for all operations |
| `src/components/events/EnhancedAgendaTab.tsx` | Replace `useState` with `useEventAgenda` hook; DB persistence for all operations |
| `src/components/events/LineupTab.tsx` | Replace `useState` with `useEventLineup` hook; replace click-to-edit with read-only session detail modal; accept `agendaSessions` prop |
| `src/components/events/EventDetailContent.tsx` | Use `useEventAgenda` + `useEventLineup` hooks; pass data to child tabs |
| `src/components/mobile/MobileTripTabs.tsx` | Same hook integration for mobile |
| `src/types/events.ts` | Add `EventLineupMember` interface if needed |
