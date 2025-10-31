# RAG System - Daily Cron Job Setup

## Phase 4 Complete: Automatic Triggers ✅

The following has been automatically configured:
- Database triggers on all trip tables (chat, tasks, polls, payments, broadcasts, calendar, links, files)
- Triggers automatically generate embeddings when new content is added
- Real-time embedding updates as trip data changes

## Manual Step Required: Daily Refresh Cron Job

To complete Phase 4, you need to manually run the following SQL in your Supabase SQL Editor:

### Steps:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/sql/new
2. Copy and paste the SQL below
3. Click "Run" to schedule the daily cron job

### SQL to Run:

```sql
-- Set up daily cron job for full embedding refresh at 2 AM
SELECT cron.schedule(
  'daily-embedding-refresh',
  '0 2 * * *',
  $$
  SELECT extensions.net.http_post(
    url := 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-embeddings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI'
    ),
    body := jsonb_build_object(
      'tripId', id,
      'sourceType', 'all',
      'forceRefresh', true
    )
  ) as request_id
  FROM trips
  WHERE is_archived = false OR is_archived IS NULL;
  $$
);
```

### What This Does:
- Runs daily at 2:00 AM UTC
- Processes all non-archived trips
- Performs full embedding refresh (all source types)
- Forces regeneration even if embeddings already exist
- Ensures embeddings stay up-to-date with trip data

### Verify Cron Job:
```sql
-- Check if cron job was created
SELECT * FROM cron.job WHERE jobname = 'daily-embedding-refresh';
```

### Remove Cron Job (if needed):
```sql
-- Remove the cron job
SELECT cron.unschedule('daily-embedding-refresh');
```

## System Status

✅ **Phase 1**: Database schema with pgvector - COMPLETE  
✅ **Phase 2**: Embedding generation service - COMPLETE  
✅ **Phase 3**: RAG-enhanced concierge - COMPLETE  
✅ **Phase 4a**: Real-time triggers - COMPLETE  
⏳ **Phase 4b**: Daily cron refresh - REQUIRES MANUAL SETUP (see above)  

Once you run the SQL above, Phase 4 will be fully complete!
