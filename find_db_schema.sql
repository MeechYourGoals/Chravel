SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('trip_events', 'trip_tasks', 'trip_polls', 'trip_links')
ORDER BY table_name, ordinal_position;
