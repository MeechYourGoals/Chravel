# Supabase Quick Reference Guide

## Critical Security Fixes Applied

### RLS Policies Fixed

1. **trip_files** - Now requires trip membership (was: anyone could read)
2. **trip_payment_messages** - Validates split participants are trip members
3. **kb_documents** - Added UPDATE/DELETE policies
4. **kb_chunks** - Added INSERT/UPDATE/DELETE policies

### New Indexes

- `idx_trip_chat_messages_trip_created_optimized` - Message queries
- `idx_trip_files_trip_status_optimized` - File filtering
- `idx_trip_payment_messages_trip_created` - Payment queries
- `idx_trip_payment_messages_trip_settled` - Settlement filtering

## Quick Commands

### Apply Migrations

```bash
# Apply all migrations locally
supabase db reset

# Apply specific migration
psql $DATABASE_URL -f supabase/migrations/20250201000000_fix_rls_policies_and_indexes.sql
```

### Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('trip_files', 'trip_payment_messages', 'kb_documents', 'kb_chunks');

-- List all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'trip_files';
```

### Verify Indexes

```sql
-- Check indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('trip_chat_messages', 'trip_files', 'trip_payment_messages')
ORDER BY tablename, indexname;
```

### Test RLS Policies

```sql
-- Test as authenticated user
SET ROLE authenticated;
SELECT * FROM trip_files WHERE trip_id = 'test-trip-id';
RESET ROLE;

-- Test as anonymous (should fail)
SET ROLE anon;
SELECT * FROM trip_files WHERE trip_id = 'test-trip-id';
RESET ROLE;
```

## Common Issues & Solutions

### Issue: Migration fails with "policy already exists"

**Solution:** Policies use `DROP POLICY IF EXISTS` before creating. If still fails, manually drop:

```sql
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
```

### Issue: Index creation fails

**Solution:** Indexes use `IF NOT EXISTS`. If still fails, check for naming conflicts:

```sql
-- List existing indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'table_name';
```

### Issue: Function validation fails

**Solution:** Ensure `validate_payment_split_participants` function exists:

```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'validate_payment_split_participants';

-- If missing, run the migration again
```

## Testing Checklist

Before deploying to production:

- [ ] Apply migrations to staging
- [ ] Verify RLS policies work correctly
- [ ] Test payment split validation
- [ ] Verify indexes are being used (`EXPLAIN ANALYZE`)
- [ ] Test backup restoration
- [ ] Run `supabase db lint`

## Key Files

- **Migrations:** `supabase/migrations/20250201000000_*.sql`
- **Documentation:** `docs/SUPABASE_*.md`
- **Report:** `SUPABASE_MVP_READINESS_REPORT.md`

## Support

For issues or questions:
1. Check migration file comments
2. Review `SUPABASE_MVP_READINESS_REPORT.md`
3. Consult `SUPABASE_MIGRATION_GUIDE.md`
