
# Fix: Enterprise Notification Toggles + Build Errors

## Problem 1: Enterprise Notification Toggles Not Working

The database table `notification_preferences` does **not** have columns for `org_announcements`, `team_updates`, `billing_alerts`, or `email_digest`. When you toggle those, the upsert tries to write to non-existent columns and fails silently. `trip_invites` works because that column exists in the DB.

Since there's no backend functionality behind Organization Announcements, Team Updates, Billing Alerts, or Weekly Email Digest, the MVP fix is to **remove those 4 toggles** and keep only **Trip Invitations** (which maps to the real `trip_invites` column and works).

### Changes

**File: `src/components/enterprise/EnterpriseNotificationsSection.tsx`**
- Remove `orgAnnouncements`, `teamUpdates`, `billingAlerts`, and `emailDigest` from the `ENTERPRISE_SETTINGS` array
- Keep only `tripInvites` (the one that actually works)
- Clean up the initial state to only include `tripInvites`

**File: `src/services/userPreferencesService.ts`**
- Remove `org_announcements`, `team_updates`, `billing_alerts`, `email_digest` from the `NotificationPreferences` interface (they don't exist in the DB)
- Remove them from `DEFAULT_NOTIFICATION_PREFERENCES`

---

## Problem 2: Pre-existing Build Errors (6 errors across 3 files)

### Fix A: `src/lib/adapters/messageAdapter.ts` (lines 43, 72)
Two `as` casts from Supabase JSON types fail because the types don't overlap. Fix by casting through `unknown` first:
- Line 43: `row.link_preview as unknown as Message['link_preview']`
- Line 72: `row.attachments as unknown as UnifiedMessage['attachments']`

### Fix B: `src/services/__tests__/calendarService.test.ts` (4 errors, lines 63, 96, 126, 152)
Test mock objects are missing `trip_id`, `created_at`, `updated_at` required by the `TripEvent` interface. Add those three fields to each test fixture.

### Fix C: `src/services/calendarService.ts` (line 905)
`availability_status` is typed as `'busy' | 'free' | 'tentative'` but the fallback `|| 'busy'` produces a `string`. Fix: use a type assertion `as const` or explicit cast: `(tripEvent.availability_status || 'busy') as 'busy' | 'free' | 'tentative'`.

---

## Files Modified

| File | Change | Risk |
|------|--------|------|
| `EnterpriseNotificationsSection.tsx` | Remove 4 non-functional toggles, keep Trip Invitations | None -- removes dead code |
| `userPreferencesService.ts` | Remove 4 non-existent DB fields from interface/defaults | None -- fields don't exist in DB |
| `messageAdapter.ts` | Add `unknown` intermediate cast on 2 lines | None -- runtime behavior unchanged |
| `calendarService.test.ts` | Add 3 missing required fields to 4 test fixtures | None -- test-only |
| `calendarService.ts` | Type-narrow availability_status fallback | None -- same runtime value |
