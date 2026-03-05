

# Fix: Restore `.env` file to unblock preview

## Root Cause

The `.env` file is **missing** from the project. The browser console shows:

```
[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set.
Error: supabaseUrl is required.
```

The Supabase client crashes at initialization (line 53 of `client.ts`) because `SUPABASE_URL` is an empty string. This prevents the entire React app from rendering — hence the blank white screen.

The `.env` file was likely deleted or overwritten during a previous edit session (the conversation history shows `-created .env` entries, which in Lovable means the file was overwritten).

## Fix

Recreate `.env` with the correct Supabase credentials:

```
VITE_SUPABASE_PROJECT_ID="jmjiyekmxwsxkfnqwyaa"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI"
VITE_SUPABASE_URL="https://jmjiyekmxwsxkfnqwyaa.supabase.co"
```

These values match what was previously in the file (visible in the conversation context). The client code at `src/integrations/supabase/client.ts` line 37-38 already supports both `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` as fallback names.

**Single file change. No other modifications needed.**

