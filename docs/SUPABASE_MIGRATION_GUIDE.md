# Supabase Migration Guide

## Overview

This guide explains how to properly manage database migrations in Chravel's Supabase project.

## Current Status

**Status:** ⚠️ Migrations need consolidation

**Issues Identified:**
- Multiple migrations modify the same tables
- Some migrations have duplicate logic
- Migration order may cause conflicts

## Migration Best Practices

### 1. Use Supabase CLI

Always use Supabase CLI for creating and managing migrations:

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Push migrations to remote
supabase db push
```

### 2. Migration Naming Convention

Use descriptive, timestamped names:

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Example:
```
20250201120000_add_user_preferences_table.sql
```

### 3. Migration Structure

Each migration should:

1. **Be Idempotent:** Use `IF NOT EXISTS` and `CREATE OR REPLACE`
2. **Be Reversible:** Document rollback steps
3. **Be Atomic:** All operations succeed or fail together
4. **Include Comments:** Explain what and why

Example:

```sql
-- Migration: Add user preferences table
-- Created: 2025-02-01
-- Purpose: Store user-specific application preferences

-- Create table (idempotent)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Add index
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
ON public.user_preferences(user_id);
```

### 4. Testing Migrations

Before applying to production:

1. **Test Locally:**
   ```bash
   supabase db reset  # Applies all migrations
   ```

2. **Test on Staging:**
   ```bash
   supabase db push --db-url $STAGING_DB_URL
   ```

3. **Verify:**
   - Check for errors in logs
   - Verify schema changes
   - Test application functionality

### 5. Rollback Strategy

Document rollback steps in migration comments:

```sql
-- Rollback steps:
-- 1. DROP POLICY "Users can manage their own preferences";
-- 2. DROP INDEX idx_user_preferences_user_id;
-- 3. DROP TABLE public.user_preferences;
```

## Consolidation Plan

### Step 1: Audit Existing Migrations

Review all migrations to identify:
- Duplicate table creations
- Conflicting changes
- Missing dependencies

### Step 2: Create Consolidated Migration

For tables modified in multiple migrations, create a single "final state" migration:

```sql
-- Consolidated migration: trip_files table
-- Combines changes from:
-- - 20250807200405_ed1ba20a-5a4d-4888-b56d-ab95bbee3df3.sql
-- - 20250115000003_contextual_data_tables.sql
-- - 20251107001035_5087e291-c88b-4cf7-86f9-6672d86652df.sql

CREATE TABLE IF NOT EXISTS public.trip_files (
  -- Final schema definition
);
```

### Step 3: Mark Old Migrations as Deprecated

Add comments to old migrations:

```sql
-- DEPRECATED: This migration has been consolidated into 20250201000000_consolidated_schema.sql
-- Do not apply this migration on fresh databases
```

## Common Migration Patterns

### Adding a Column

```sql
-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN new_column TEXT;
  END IF;
END $$;
```

### Modifying RLS Policies

```sql
-- Drop old policy
DROP POLICY IF EXISTS "old_policy_name" ON public.table_name;

-- Create new policy
CREATE POLICY "new_policy_name"
ON public.table_name
FOR SELECT
USING (/* new condition */);
```

### Adding Indexes

```sql
-- Use IF NOT EXISTS to avoid errors
CREATE INDEX IF NOT EXISTS idx_table_column
ON public.table_name(column_name);
```

## Migration Checklist

Before creating a migration:

- [ ] Check if table/column already exists
- [ ] Use idempotent operations (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- [ ] Add RLS policies if creating a table
- [ ] Add indexes for common query patterns
- [ ] Add comments explaining the change
- [ ] Document rollback steps
- [ ] Test locally first

Before applying to production:

- [ ] Create backup
- [ ] Review migration SQL
- [ ] Test on staging
- [ ] Schedule during low-traffic window
- [ ] Monitor after application

## Tools & Commands

### Supabase CLI

```bash
# Initialize project (first time)
supabase init

# Start local development
supabase start

# Create migration
supabase migration new add_feature

# Apply migrations locally
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Push to remote
supabase db push
```

### Useful SQL Queries

```sql
-- List all migrations applied
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'table_name'
);

-- Check column exists
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'table_name' AND column_name = 'column_name'
);

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'table_name';
```

## Next Steps

1. **Audit Migrations:** Review all migration files
2. **Identify Duplicates:** Find tables modified multiple times
3. **Create Consolidation Plan:** Document which migrations to merge
4. **Test Consolidation:** Apply consolidated migrations to staging
5. **Update Documentation:** Keep this guide updated

## References

- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl-alter.html)
