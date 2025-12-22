# 🗄️ Database Migration Instructions

**Migration File:** `supabase/migrations/20251026184113_add_frequent_chraveler_features.sql`
**Status:** ⚠️ Ready to apply (not yet executed)

---

## 🚀 Option 1: Apply via Supabase Studio (RECOMMENDED - Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your Chravel project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open: `supabase/migrations/20251026184113_add_frequent_chraveler_features.sql`
   - Copy the entire contents (all 6.2KB)

4. **Paste and Execute**
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for confirmation: "Success. No rows returned"

5. **Verify Migration**
   - Click "Table Editor" in sidebar
   - Find `trips` table → verify `categories` column exists (type: jsonb)
   - Find `user_pro_trip_quota` table → verify it exists

✅ **Done!** Migration applied successfully.

---

## 🚀 Option 2: Apply via Supabase CLI (If you have it installed)

```bash
cd /home/user/Chravel
supabase db push
```

If you don't have Supabase CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Or via Homebrew (macOS)
brew install supabase/tap/supabase

# Then apply migration
cd /home/user/Chravel
supabase db push
```

---

## ✅ Post-Migration Verification

Run these queries in Supabase SQL Editor to verify:

### 1. Check trips.categories column exists
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'trips' AND column_name = 'categories';
```
**Expected:** 1 row returned showing `categories | jsonb | '[]'::jsonb`

### 2. Check user_pro_trip_quota table exists
```sql
SELECT * FROM user_pro_trip_quota LIMIT 0;
```
**Expected:** "Success. No rows returned" (table exists but empty)

### 3. Test helper function
```sql
SELECT * FROM get_user_pro_trip_quota('00000000-0000-0000-0000-000000000000');
```
**Expected:** Returns `(0, 1, true)` for a non-existent user

### 4. Check RLS policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('trips', 'user_pro_trip_quota')
ORDER BY tablename, policyname;
```
**Expected:** Multiple policies returned for both tables

---

## 🐛 Troubleshooting

### Error: "column 'categories' already exists"
**Solution:** Migration already applied. Safe to ignore. Verify with:
```sql
SELECT categories FROM trips LIMIT 1;
```

### Error: "relation 'user_pro_trip_quota' already exists"
**Solution:** Migration already applied. Safe to ignore.

### Error: "function update_updated_at_column() does not exist"
**Solution:** This function should exist from earlier migrations. Check:
```sql
SELECT proname FROM pg_proc WHERE proname = 'update_updated_at_column';
```
If missing, add this before the migration:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## 📋 Migration Summary

This migration adds:
- ✅ `trips.categories` column (JSONB, default: `[]`)
- ✅ `user_pro_trip_quota` table (tracks 1 Pro trip/month limit)
- ✅ Helper functions:
  - `get_user_pro_trip_quota(user_id)` - Get current quota
  - `increment_pro_trip_count(user_id)` - Increment count
  - `check_ai_query_limit(user_id, trip_id, tier)` - Check AI limits
- ✅ RLS policies for secure access
- ✅ Indexes for performance

**Total size:** 6.2KB SQL
**Estimated execution time:** < 5 seconds
**Rollback available:** Yes (commented at end of migration file)

---

## ⏭️ What to Do After Migration

Once migration is applied:

1. ✅ **Update TripCategorySelector** (optional)
   - File: `src/components/trip/TripCategorySelector.tsx`
   - Change localStorage persistence to Supabase
   - See CURSOR_PROMPT.md for instructions

2. ✅ **Create Stripe Products**
   - Replace `prod_TBD_FREQUENT_CHRAVELER` with real ID
   - Replace `prod_TBD_EXPLORER` with real ID

3. ✅ **Test End-to-End**
   - Subscribe to tier
   - Edit trip categories
   - Create Pro trip (Frequent Chraveler only)

4. ✅ **Deploy to Production**
   - Merge branch to main
   - Apply migration on production DB
   - Monitor logs

---

**Status After Migration:** ✅ FULLY OPERATIONAL
