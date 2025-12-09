-- Event Agenda Items Table
CREATE TABLE IF NOT EXISTS event_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  track text,
  speakers text[],
  created_by uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event Tasks Table
CREATE TABLE IF NOT EXISTS event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  created_by uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now()
);

-- Add file_category column to trip_files if not exists
ALTER TABLE trip_files ADD COLUMN IF NOT EXISTS file_category text DEFAULT 'general';

-- RLS for event_agenda_items
ALTER TABLE event_agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view agenda items" ON event_agenda_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid())
);

CREATE POLICY "Event admins can insert agenda items" ON event_agenda_items
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = event_id AND user_id = auth.uid())
);

CREATE POLICY "Event admins can update agenda items" ON event_agenda_items
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = event_id AND user_id = auth.uid())
);

CREATE POLICY "Event admins can delete agenda items" ON event_agenda_items
FOR DELETE USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = event_id AND user_id = auth.uid())
);

-- RLS for event_tasks
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view tasks" ON event_tasks
FOR SELECT USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid())
);

CREATE POLICY "Event admins can insert tasks" ON event_tasks
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = event_id AND user_id = auth.uid())
);

CREATE POLICY "Event admins can update tasks" ON event_tasks
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = event_id AND user_id = auth.uid())
);

CREATE POLICY "Event admins can delete tasks" ON event_tasks
FOR DELETE USING (
  EXISTS (SELECT 1 FROM trip_members WHERE trip_id = event_id AND user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = event_id AND user_id = auth.uid())
);

-- Update trigger for event_agenda_items
CREATE TRIGGER update_event_agenda_items_updated_at
BEFORE UPDATE ON event_agenda_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();