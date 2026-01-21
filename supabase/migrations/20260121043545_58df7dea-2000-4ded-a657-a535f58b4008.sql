-- Backfill channel_role_access from existing required_role_id values
-- This ensures multi-role channel access works for existing channels
INSERT INTO channel_role_access (channel_id, role_id)
SELECT id, required_role_id
FROM trip_channels
WHERE required_role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM channel_role_access cra 
    WHERE cra.channel_id = trip_channels.id 
      AND cra.role_id = trip_channels.required_role_id
  );