-- Phase 4: Enable extensions for automatic embedding refresh

-- Enable pg_net for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;