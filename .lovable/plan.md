
# Fix: Pro Trip and Event Creation Blocked by Database Constraint

## Root Cause (Confirmed from Edge Function Logs)

The error is:
```
new row for relation "trips" violates check constraint "valid_enabled_features"
```

The database has a CHECK constraint called `valid_enabled_features` that only allows these 8 values:
```
chat, calendar, concierge, media, payments, places, polls, tasks
```

But the `create-trip` edge function sends these additional features:
- **Pro trips**: `team`
- **Event trips**: `agenda`, `lineup`

These 3 values are rejected by the constraint, causing every Pro trip and Event creation to fail with a 500 error.

Consumer trips work fine because their feature set (`chat, calendar, concierge, media, payments, places, polls, tasks`) is an exact match.

## Fix

**One database migration** -- update the CHECK constraint to include all valid feature values:

```sql
ALTER TABLE trips DROP CONSTRAINT valid_enabled_features;

ALTER TABLE trips ADD CONSTRAINT valid_enabled_features
  CHECK (enabled_features <@ ARRAY[
    'agenda', 'calendar', 'chat', 'concierge',
    'lineup', 'media', 'payments', 'places',
    'polls', 'tasks', 'team'
  ]::text[]);
```

That is the entire fix. No code changes needed -- the edge function, frontend forms, and feature configs are all correct. The constraint is the sole blocker.

## Why This is Safe

- The constraint still validates that only known feature names can be stored (no typos, no injection)
- Consumer trips are unaffected (their features are a subset of the expanded list)
- No code changes means zero regression risk to existing functionality
- The `proCategories.ts` config already lists `team` as a required tab for all Pro categories
- The edge function's `DEFAULT_FEATURES_BY_TYPE` already defines the correct feature sets

## Verification

After the migration, creating a Pro trip with the exact form data shown in the screenshot ("Nurse John Europe Tour", Tour category, Overseas location) will succeed immediately.
