# Migration Overlap & Schema Conflict Risk Report

**Date:** 2026-02-19  
**Scope:** All migrations in `supabase/migrations/`  
**Purpose:** Identify overlapping migrations, duplicate schema changes, and risks to canonical single sources of truth.

---

## Executive Summary

| Risk Level | Count | Description |
|------------|-------|-------------|
| **HIGH** | 2 | Migrations that will fail or overwrite each other when run in sequence |
| **MEDIUM** | 5 | Redundant migrations; safe but create maintenance burden and drift risk |
| **LOW** | 4 | Intentional evolution (CREATE OR REPLACE); last migration wins |
| **INFO** | 2 | Untimestamped migrations; unpredictable run order |

---

## 1. HIGH RISK — Will Fail or Cause Data Loss

### 1.1 `web_push_subscriptions` — Duplicate Table + Policy Conflict

**Migrations:**
- `20260204000000_create_web_push_subscriptions.sql`
- `20260204042335_0b020051-bc29-4e1f-9162-3e40e35d313e.sql`

**Conflict:**
- Both create `web_push_subscriptions` with `CREATE TABLE IF NOT EXISTS` (first wins).
- Both create policy `"Users can view own subscriptions"` — **second migration fails** with "policy already exists."
- Different triggers: first uses `update_web_push_subscriptions_updated_at()`, second uses `update_updated_at_column()`.
- Slight schema differences (NOT NULL on some columns in second).

**Impact:** `20260204042335` will fail when run after `20260204000000`.

**Recommendation:** Remove `20260204042335_0b020051-bc29-4e1f-9162-3e40e35d313e.sql` or merge its changes (e.g., NOT NULL constraints) into `20260204000000` and delete the duplicate.

---

### 1.2 Lovable Migration (Not in Current Branch) — `profiles_public` Overlap

**Migration:** `20260219063027_3af8fd22-d270-4fe1-b55c-edcfa85abd72.sql` (added by Lovable "Consolidated realtime hub", not in `cursor/voice-chat-image-features-8c90`)

**Conflict:** Duplicates `real_name` and `name_preference` columns and recreates `profiles_public` with a **simplified** view definition. The existing `20260212000000_add_real_name_and_name_preference.sql` is more complete (check constraint, backfill, full `profiles_public` with bio, show_email, show_phone, etc.).

**Impact:** If the Lovable branch is merged, the Lovable migration could overwrite `profiles_public` with a reduced definition, losing columns and privacy logic.

**Recommendation:** If merging the Lovable branch, delete the Lovable migration or ensure it does not touch `profiles_public` / `real_name` / `name_preference`.

---

## 2. MEDIUM RISK — Redundant Migrations (Maintenance Burden)

### 2.1 `organizer_display_name` on `trips` — Duplicate Column Add

**Migrations:**
- `20260204000000_add_organizer_display_name.sql`
- `20260205041602_4257192f-3f93-4b40-a39f-0e3d2023542a.sql`

**Conflict:** Both add the same column and index. `ADD COLUMN IF NOT EXISTS` makes the second idempotent, but the second migration is redundant.

**Recommendation:** Remove `20260205041602_4257192f-3f93-4b40-a39f-0e3d2023542a.sql` or consolidate into a single migration.

---

### 2.2 `valid_enabled_features` Constraint — Duplicate DROP/ADD

**Migrations:**
- `20260208000000_fix_enabled_features_constraint.sql` — DROP + ADD + COMMENT
- `20260209183903_68789913-c5ce-484e-bde4-2051366432eb.sql` — DROP + ADD (no COMMENT)

**Conflict:** Both drop and recreate the same constraint with the same allowed values. The second is redundant.

**Recommendation:** Remove `20260209183903_68789913-c5ce-484e-bde4-2051366432eb.sql` or merge into `20260208000000`.

---

### 2.3 `profiles_public` View — Multiple Recreations (Same Day)

**Migrations (chronological):**
- `20260202100000_identity_snapshot_and_name_change_policy.sql` — DROP + CREATE
- `20260202215234_cd76ff51-8293-4192-9046-4b897fedb582.sql` — DROP + CREATE (relaxed WHERE)
- `20260202220351_b047a75d-6e2a-4559-88de-3aeb41229e1d.sql` — DROP + CREATE (similar, different column set)

**Conflict:** Three migrations on the same day all DROP and CREATE `profiles_public`. Each overwrites the previous. Final state depends on run order; logic is fragmented across files.

**Recommendation:** Consolidate into a single migration that defines the canonical `profiles_public` view. Consider a follow-up "consolidation" migration that DROP + CREATE once with the final definition from `20260212000000_add_real_name_and_name_preference.sql`.

---

### 2.4 `is_trip_co_member()` Function — Multiple Definitions

**Migrations:**
- `20260108002157_c49485c3-6850-4b9a-8c28-3e219ac07742.sql`
- `20260202100000_identity_snapshot_and_name_change_policy.sql`
- `20260202215234_cd76ff51-8293-4192-9046-4b897fedb582.sql`
- `20260202220351_b047a75d-6e2a-4559-88de-3aeb41229e1d.sql`

**Conflict:** All use `CREATE OR REPLACE FUNCTION`. Later migrations extend logic (e.g., trip creator check). Last migration wins; no failure, but logic is spread across four files.

**Recommendation:** Document that `20260202220351` (or the latest) is the canonical definition. Consider a single "canonical" migration that defines `is_trip_co_member` once.

---

### 2.5 `initialize_trip_privacy_config()` — Multiple Updates

**Migrations:**
- `20250909000859_c177dbf9-e1ed-4d4a-88b9-681a02612b98.sql`
- `20250909000939_347f4964-d3f0-46f7-a37e-8d5cef56ef72.sql`
- `20251119053411_4ace55c3-740e-496e-a16e-1367f1e47f73.sql`
- `20260201191117_72aa7648-3d92-4df3-8655-ada4224d3f2a.sql`
- `20260217022719_ceeb9e88-76d4-4faa-8d29-5670a8fe633e.sql`
- `20260212170000_enable_ai_concierge_for_pro_high_privacy.sql`

**Conflict:** All use `CREATE OR REPLACE FUNCTION`. Last migration wins. Evolution is intentional but scattered.

**Recommendation:** Document that `20260212170000` is the canonical version. Consider a comment in that migration listing prior versions for audit.

---

## 3. LOW RISK — Intentional Evolution (Last Wins)

These use `CREATE OR REPLACE` or `ADD COLUMN IF NOT EXISTS`; the final migration defines the canonical state.

| Object | Migrations | Notes |
|--------|------------|-------|
| `approve_join_request` | 20260113000000, 20251219000001, 20260104000000, 20260216000000, 20260218000001 | Re-join support, invite uses, etc. |
| `leave_trip` | 20260218000000, 20260218000001 | Edge cases, trip_admins cleanup |
| `notify_on_chat_message` | 20260108021006, 20260108021722, 20260218000000 | Mentions, status column, active members |
| `notify_on_calendar_event` | 20260216000001, 20260216195604, 20260216195648, 20260218000000 | Bulk import skip, active members |
| `transfer_channel_ownership_on_leave` | 20260113100000, 20260218000000 | 20260218000000 adds member delete trigger |

---

## 4. INFO — Untimestamped Migrations

**Files:**
- `fix_push_notification_rls.sql`
- `add_trip_collaboration_features.sql`

**Risk:** No timestamp prefix; run order is undefined relative to timestamped migrations. May run before or after migrations that assume their objects exist.

**Recommendation:** Rename to timestamped format (e.g. `20260219000000_fix_push_notification_rls.sql`) and place in correct chronological order.

---

## 5. Schema Qualification Inconsistency

Some migrations use `ALTER TABLE trips`; others use `ALTER TABLE public.trips`. Both work if `search_path` includes `public`, but `public.` is safer and more explicit.

**Examples:**
- `20260209183903`: `ALTER TABLE trips` (no schema)
- `20260208000000`: `ALTER TABLE public.trips` (with schema)

**Recommendation:** Standardize on `public.` for all DDL.

---

## 6. Canonical Sources of Truth (Recommended)

| Object | Canonical Migration | Rationale |
|--------|--------------------|-----------|
| `profiles_public` | `20260212000000_add_real_name_and_name_preference.sql` | Most complete: real_name, name_preference, resolved_display_name, privacy |
| `web_push_subscriptions` | `20260204000000_create_web_push_subscriptions.sql` | First, most complete; includes notification_queue |
| `organizer_display_name` | `20260204000000_add_organizer_display_name.sql` | First definition |
| `valid_enabled_features` | `20260208000000_fix_enabled_features_constraint.sql` | Includes COMMENT |
| `is_trip_co_member` | `20260202220351_b047a75d-6e2a-4559-88de-3aeb41229e1d.sql` | Latest with trip creator check |
| `initialize_trip_privacy_config` | `20260212170000_enable_ai_concierge_for_pro_high_privacy.sql` | Latest; Pro/Event AI concierge logic |

---

## 7. Action Items (Prioritized)

1. **HIGH:** Remove or fix `20260204042335_0b020051-bc29-4e1f-9162-3e40e35d313e.sql` so it does not duplicate `web_push_subscriptions` table or policies.
2. **HIGH:** If merging Lovable branch, remove or adjust `20260219063027_3af8fd22-d270-4fe1-b55c-edcfa85abd72.sql` to avoid overwriting `profiles_public`.
3. **MEDIUM:** Remove redundant migrations: `20260205041602`, `20260209183903`.
4. **MEDIUM:** Add a consolidation note or migration that documents the final `profiles_public` and `is_trip_co_member` definitions.
5. **LOW:** Rename untimestamped migrations to timestamped format.
6. **LOW:** Standardize schema qualification (`public.`) in DDL.

---

## 8. Verification Commands

```bash
# List migrations in run order
ls -1 supabase/migrations/*.sql | sort

# Check for duplicate policy names
grep -h "CREATE POLICY" supabase/migrations/*.sql | sort | uniq -d

# Check for duplicate table creation
grep -h "CREATE TABLE.*web_push_subscriptions" supabase/migrations/*.sql
```

---

**Last Updated:** 2026-02-19
