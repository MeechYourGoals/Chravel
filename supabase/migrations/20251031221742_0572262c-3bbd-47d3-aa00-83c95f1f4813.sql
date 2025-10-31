-- Fix security issue: Remove hardcoded anon key from queue_embedding_refresh function
-- This migration replaces the trigger-based approach with application-triggered embedding generation

-- Drop all existing embedding refresh triggers
DROP TRIGGER IF EXISTS refresh_chat_embeddings ON trip_chat_messages;
DROP TRIGGER IF EXISTS refresh_task_embeddings ON trip_tasks;
DROP TRIGGER IF EXISTS refresh_poll_embeddings ON trip_polls;
DROP TRIGGER IF EXISTS refresh_payment_embeddings ON trip_payment_messages;
DROP TRIGGER IF EXISTS refresh_broadcast_embeddings ON broadcasts;
DROP TRIGGER IF EXISTS refresh_calendar_embeddings ON trip_events;
DROP TRIGGER IF EXISTS refresh_link_embeddings ON trip_links;
DROP TRIGGER IF EXISTS refresh_file_embeddings ON trip_files;

-- Drop the function with hardcoded credentials
DROP FUNCTION IF EXISTS queue_embedding_refresh();

-- Note: Embedding generation is now triggered explicitly from the application layer
-- via the generate-embeddings edge function, which provides better security by:
-- 1. Not exposing credentials in database functions
-- 2. Allowing proper rate limiting and authentication
-- 3. Enabling better error handling and monitoring
-- 4. Supporting demo mode and other application logic

COMMENT ON TABLE trip_embeddings IS 'Stores vector embeddings for trip content. Embeddings are generated via the generate-embeddings edge function called from the application layer for better security and control.';