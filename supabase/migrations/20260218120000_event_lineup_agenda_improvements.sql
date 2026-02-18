-- Event Agenda & Lineup Improvements
-- Unique constraint for lineup members (case-insensitive deduplication)
-- Indexes for query performance at scale

-- Unique index: prevent duplicate lineup members per event (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS event_lineup_members_event_name_lower_unique
  ON public.event_lineup_members (event_id, LOWER(name));

-- Index for agenda queries: event + date + time ordering
CREATE INDEX IF NOT EXISTS event_agenda_items_event_date_time_idx
  ON public.event_agenda_items (event_id, session_date NULLS LAST, start_time NULLS LAST);

-- Index for lineup queries: event + name ordering
CREATE INDEX IF NOT EXISTS event_lineup_members_event_name_idx
  ON public.event_lineup_members (event_id, name);
