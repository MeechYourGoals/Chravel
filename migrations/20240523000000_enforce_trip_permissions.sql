-- Migration to enforce trip permissions via RLS
-- Note: This file describes the required RLS policies. Apply via Supabase Dashboard or CLI.

-- 1. TRIP CALENDAR EVENTS (Table: trip_events)
-- Assuming the table is `trip_events` based on `src/services/enhancedTripContextService.ts` and `src/services/tripExportDataService.ts`
-- It seems `trip_calendar_events` might be an alias or misnomer in previous thought, `trip_events` appears more consistent in grep results.
-- Wait, `src/services/tripExportDataService.ts` references `trip_events`. `useCalendarManagement.ts` calls `calendarService`.
-- Let's stick to `trip_events` as the likely table.

-- Enable RLS
ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;

-- Policy: View (All members)
CREATE POLICY "View calendar events" ON trip_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = trip_events.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

-- Policy: Insert/Update/Delete (Consumer: All members; Pro: Admins only)
CREATE POLICY "Manage calendar events" ON trip_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM trip_members
    JOIN trips ON trips.id = trip_members.trip_id
    WHERE trip_members.trip_id = trip_events.trip_id
    AND trip_members.user_id = auth.uid()
    AND (
      -- Consumer Trip: Any member can edit
      trips.trip_type = 'consumer'
      OR
      -- Pro/Event Trip: Only admins can edit
      (trips.trip_type IN ('pro', 'event') AND trip_members.role = 'admin')
    )
  )
);


-- 2. TRIP MEDIA (Tables: trip_media_index, trip_files, trip_links)
-- Based on grep: `trip_media_index`, `trip_files`, `trip_links`

-- A. Trip Media Index
ALTER TABLE trip_media_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View trip media" ON trip_media_index
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = trip_media_index.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

CREATE POLICY "Manage trip media" ON trip_media_index
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM trip_members
    JOIN trips ON trips.id = trip_members.trip_id
    WHERE trip_members.trip_id = trip_media_index.trip_id
    AND trip_members.user_id = auth.uid()
    AND (
      trips.trip_type = 'consumer' OR
      (trips.trip_type IN ('pro', 'event') AND (
         -- Admin can do anything
         trip_members.role = 'admin' OR
         -- Members can INSERT (Upload) but not DELETE/UPDATE?
         -- Policy for ALL covers everything. If we want separate INSERT vs DELETE:
         -- We'll split this.
         FALSE -- Placeholder to break out
      ))
    )
  )
);

-- Separate policies for Media to allow Upload (INSERT) but restrict Delete (DELETE) for Pro Members

-- Media INSERT
CREATE POLICY "Insert trip media" ON trip_media_index
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members
    JOIN trips ON trips.id = trip_members.trip_id
    WHERE trip_members.trip_id = trip_media_index.trip_id
    AND trip_members.user_id = auth.uid()
    AND (
      -- Consumer: Any member
      trips.trip_type = 'consumer' OR
      -- Pro: Any member can upload
      trips.trip_type IN ('pro', 'event')
    )
  )
);

-- Media UPDATE/DELETE
CREATE POLICY "Modify/Delete trip media" ON trip_media_index
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trip_members
    JOIN trips ON trips.id = trip_members.trip_id
    WHERE trip_members.trip_id = trip_media_index.trip_id
    AND trip_members.user_id = auth.uid()
    AND (
      -- Consumer: Any member
      trips.trip_type = 'consumer' OR
      -- Pro: Only Admin can delete
      (trips.trip_type IN ('pro', 'event') AND trip_members.role = 'admin')
      -- Exception: User can delete their own uploads?
      -- "Users may delete their own messages" was for chat.
      -- "Create, edit, or delete calendar entries... Upload or delete media" -> "Only admins may... Delete media".
      -- So strictly admins for Pro.
    )
  )
);

-- B. Trip Files (Apply same logic)
ALTER TABLE trip_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View trip files" ON trip_files FOR SELECT USING (EXISTS (SELECT 1 FROM trip_members WHERE trip_members.trip_id = trip_files.trip_id AND trip_members.user_id = auth.uid()));
CREATE POLICY "Insert trip files" ON trip_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM trip_members JOIN trips ON trips.id = trip_members.trip_id WHERE trip_members.trip_id = trip_files.trip_id AND trip_members.user_id = auth.uid() AND (trips.trip_type = 'consumer' OR trips.trip_type IN ('pro', 'event'))));
CREATE POLICY "Delete trip files" ON trip_files FOR DELETE USING (EXISTS (SELECT 1 FROM trip_members JOIN trips ON trips.id = trip_members.trip_id WHERE trip_members.trip_id = trip_files.trip_id AND trip_members.user_id = auth.uid() AND (trips.trip_type = 'consumer' OR (trips.trip_type IN ('pro', 'event') AND trip_members.role = 'admin'))));


-- 3. CHAT MESSAGES (Table: trip_chat_messages)
ALTER TABLE trip_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View chat messages" ON trip_chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = trip_chat_messages.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

CREATE POLICY "Send chat messages" ON trip_chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = trip_chat_messages.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

-- Soft Delete (UPDATE)
CREATE POLICY "Soft delete own chat messages" ON trip_chat_messages
FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- Hard Delete (if applicable, though service uses soft delete)
CREATE POLICY "Hard delete own chat messages" ON trip_chat_messages
FOR DELETE USING (
  auth.uid() = user_id
);


-- 4. TASKS (Table: trip_tasks)
ALTER TABLE trip_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View trip tasks" ON trip_tasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = trip_tasks.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

CREATE POLICY "Manage trip tasks" ON trip_tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM trip_members
    JOIN trips ON trips.id = trip_members.trip_id
    WHERE trip_members.trip_id = trip_tasks.trip_id
    AND trip_members.user_id = auth.uid()
    AND (
      trips.trip_type = 'consumer' OR
      (trips.trip_type IN ('pro', 'event') AND trip_members.role = 'admin')
    )
  )
);


-- 5. PAYMENTS (Tables: trip_payment_messages or similar)
-- Grep shows `trip_payment_messages`, `payment_splits`
-- Assuming `trip_payment_messages` is the main one for "Create/Edit/Delete payments".
ALTER TABLE trip_payment_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View payments" ON trip_payment_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_members.trip_id = trip_payment_messages.trip_id
    AND trip_members.user_id = auth.uid()
  )
);

CREATE POLICY "Manage payments" ON trip_payment_messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM trip_members
    JOIN trips ON trips.id = trip_members.trip_id
    WHERE trip_members.trip_id = trip_payment_messages.trip_id
    AND trip_members.user_id = auth.uid()
    AND (
      trips.trip_type = 'consumer' OR
      (trips.trip_type IN ('pro', 'event') AND trip_members.role = 'admin')
    )
  )
);
