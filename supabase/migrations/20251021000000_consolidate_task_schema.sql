-- Consolidate task schema - fix schema mismatch between trip_task_status and task_status
-- This migration consolidates to use task_status as the single source of truth

-- First, migrate any existing data from trip_task_status to task_status (if it exists)
DO $$
BEGIN
  -- Check if trip_task_status table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trip_task_status') THEN
    -- Migrate data if task_status also exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_status') THEN
      -- Insert data from trip_task_status to task_status if not already there
      INSERT INTO task_status (task_id, user_id, is_completed, completed_at, version, created_at, updated_at)
      SELECT
        task_id,
        user_id,
        is_completed,
        completed_at,
        COALESCE(version, 1) as version,
        COALESCE(created_at, NOW()) as created_at,
        COALESCE(updated_at, NOW()) as updated_at
      FROM trip_task_status
      ON CONFLICT (task_id, user_id) DO NOTHING;
    END IF;

    -- Drop the old table
    DROP TABLE IF EXISTS trip_task_status CASCADE;
  END IF;
END $$;

-- Ensure task_status has the correct structure
-- If it doesn't exist, create it; if it does, alter it to match
CREATE TABLE IF NOT EXISTS task_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES trip_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_status_task_id ON task_status(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_user_id ON task_status(user_id);
CREATE INDEX IF NOT EXISTS idx_task_status_task_user ON task_status(task_id, user_id);

-- Update the RPC function to use the consolidated schema
CREATE OR REPLACE FUNCTION toggle_task_status(
  p_task_id UUID,
  p_user_id UUID,
  p_current_version INTEGER DEFAULT 1
)
RETURNS TABLE(success BOOLEAN, new_version INTEGER, is_completed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status BOOLEAN;
  v_db_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Get current status and version
  SELECT ts.is_completed, ts.version
  INTO v_current_status, v_db_version
  FROM task_status ts
  WHERE ts.task_id = p_task_id AND ts.user_id = p_user_id;

  -- If status doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO task_status (task_id, user_id, is_completed, version, completed_at)
    VALUES (p_task_id, p_user_id, TRUE, 1, NOW())
    RETURNING task_status.version, task_status.is_completed INTO v_new_version, v_current_status;

    RETURN QUERY SELECT TRUE, v_new_version, v_current_status;
    RETURN;
  END IF;

  -- Check version for optimistic locking
  IF v_db_version != p_current_version THEN
    RAISE EXCEPTION 'Task has been modified by another user. Please refresh and try again.';
  END IF;

  -- Toggle the status
  v_new_version := v_db_version + 1;

  UPDATE task_status
  SET
    is_completed = NOT v_current_status,
    completed_at = CASE WHEN NOT v_current_status THEN NOW() ELSE NULL END,
    version = v_new_version,
    updated_at = NOW()
  WHERE task_id = p_task_id AND user_id = p_user_id;

  RETURN QUERY SELECT TRUE, v_new_version, NOT v_current_status;
END;
$$;

-- Add RLS policies if they don't exist
ALTER TABLE task_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view task status for trips they're members of
DROP POLICY IF EXISTS "Users can view task status for their trips" ON task_status;
CREATE POLICY "Users can view task status for their trips" ON task_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_tasks tt
      JOIN trip_members tm ON tt.trip_id = tm.trip_id
      WHERE tt.id = task_status.task_id
        AND tm.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own task status
DROP POLICY IF EXISTS "Users can insert their own task status" ON task_status;
CREATE POLICY "Users can insert their own task status" ON task_status
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own task status
DROP POLICY IF EXISTS "Users can update their own task status" ON task_status;
CREATE POLICY "Users can update their own task status" ON task_status
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own task status
DROP POLICY IF EXISTS "Users can delete their own task status" ON task_status;
CREATE POLICY "Users can delete their own task status" ON task_status
  FOR DELETE
  USING (user_id = auth.uid());

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_status_timestamp ON task_status;
CREATE TRIGGER update_task_status_timestamp
  BEFORE UPDATE ON task_status
  FOR EACH ROW
  EXECUTE FUNCTION update_task_status_timestamp();

-- Comment the table for documentation
COMMENT ON TABLE task_status IS 'Consolidated task completion status table - tracks per-user completion status for trip tasks with optimistic locking';
COMMENT ON COLUMN task_status.version IS 'Version number for optimistic locking to prevent concurrent update conflicts';
COMMENT ON COLUMN task_status.task_id IS 'References the trip_tasks table';
COMMENT ON COLUMN task_status.user_id IS 'User who completed or is tracking the task';
