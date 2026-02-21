# Chravel Schema Consistency Audit Report

**Date:** 2026-02-21
**Scope:** Full-stack top-down audit across DB, API, types, hooks, and UI layers
**Auditor:** Claude Code (Staff Engineer Audit)

---

## 1) Audit Summary

| Metric | Count |
|---|---|
| **Total mismatches found** | **47** |
| High-risk (data loss, silent failures, broken UI) | **12** |
| Medium-risk (inconsistent behavior, confusing DX) | **19** |
| Low-risk (cleanup opportunities, naming style) | **16** |

### High-Risk Highlights
- **PaymentMethod type** contains BOTH snake_case and camelCase fields in the same interface (dual-field pattern)
- **channel_messages** DB uses `sender_id` but app type `ChannelMessage` uses `user_id`
- **trip_chat_messages** DB uses `user_id` but app type `Message` uses `sender_id` (inverse of channels)
- **CalendarEvent** app type splits DB `start_time` into separate `date: Date` + `time: string` with no standard adapter
- **Notification type enums** exist in 3 different definitions (backend, frontend service, mock data) with different values
- **user_accommodations.accommodation_name** vs app type `UserAccommodation.label` -- silent mapping failure risk
- **trip_channels.channel_name** vs app type `TripChannel.name` -- schema mismatch
- **is_settled** is `boolean | null` in DB but `boolean` (non-nullable) in app types
- **include_in_itinerary** is `boolean | null` in DB but `boolean` (non-nullable) in app types
- **Duplicate Message interface** in `messages.ts` vs `messaging.ts` with conflicting field names
- **PRO_TRIP_CATEGORIES** in consumer.ts uses kebab-case IDs that don't match `ProCategoryEnum` values
- **Permission naming**: Trip roles use `can_view` (snake_case), Event roles use `canView` (camelCase)

---

## 2) Canonical Naming Strategy

### Conventions to enforce:

| Layer | Convention | Example |
|---|---|---|
| **Database columns** | `snake_case` | `trip_id`, `created_at`, `is_settled` |
| **Frontend types/props** | `camelCase` | `tripId`, `createdAt`, `isSettled` |
| **Adapter layer** | explicit mapping function | `toAppPayment(dbRow)` / `toDbPayment(appObj)` |
| **Enums** | `UPPER_SNAKE_CASE` for const, `camelCase` for union types | `NOTIFICATION_CATEGORIES`, `'chatMessages'` |
| **Booleans** | `is_` prefix in DB, `is` prefix in app | DB: `is_settled`, App: `isSettled` |
| **Date/time fields** | `_at` suffix for timestamps, `_date` for date-only | `created_at`, `start_time`, `due_at` |
| **ID fields** | `entity_id` in DB, `entityId` in app | DB: `trip_id`, App: `tripId` |
| **Nullability** | Match DB nullability in app types; use `| null` not `undefined` for DB-sourced fields | `isSettled: boolean \| null` |

### Key Rules:
1. **DB is snake_case, always.** Never introduce camelCase in DB columns.
2. **App types are camelCase, always.** Never pass raw snake_case DB fields to components.
3. **One adapter per entity.** Every Supabase query result must pass through a typed adapter before reaching components.
4. **Nullable in DB = nullable in app type.** Do not silently coerce `null` to `false`/`''` in types; do it explicitly in the adapter.
5. **One canonical enum source per concept.** No duplicating enum values across files.

---

## 3) Mismatch Inventory

### 3a. Field Name Mismatches (snake_case vs camelCase)

| # | Concept | DB Field | App Type Field | Layers Affected | Risk | Fix Strategy |
|---|---|---|---|---|---|---|
| 1 | Payment trip ref | `trip_id` | `tripId` | DB/types/hooks/UI | **High** | Adapter: `toAppPayment()` |
| 2 | Payment creator | `created_by` | `createdBy` | DB/types/hooks | Med | Adapter |
| 3 | Payment timestamp | `created_at` | `createdAt` | DB/types/hooks | Med | Adapter |
| 4 | Payment split count | `split_count` | `splitCount` | DB/types/hooks | Med | Adapter |
| 5 | Payment participants | `split_participants` (Json) | `splitParticipants` (string[]) | DB/types | **High** | Adapter + type fix |
| 6 | Payment methods | `payment_methods` (Json) | `paymentMethods` (string[]) | DB/types | **High** | Adapter + type fix |
| 7 | Payment settled | `is_settled` (bool\|null) | `isSettled` (bool) | DB/types | **High** | Fix nullability |
| 8 | Payment message ref | `message_id` | `messageId` | DB/types | Med | Adapter |
| 9 | Org display name | `display_name` | `displayName` | DB/types | Med | Adapter |
| 10 | Org seat limit | `seat_limit` | `seatLimit` | DB/types | Med | Adapter |
| 11 | Org seats used | `seats_used` | `seatsUsed` | DB/types | Med | Adapter |
| 12 | Org subscription status | `subscription_status` | `subscriptionStatus` | DB/types | Med | Adapter |
| 13 | Org member user ref | `user_id` | `userId` | DB/types | Med | Adapter |
| 14 | Org member joined | `joined_at` | `joinedAt` | DB/types | Low | Adapter |
| 15 | Read receipt msg ref | `message_id` | `messageId` | DB/types | Low | Adapter |
| 16 | Read receipt read time | `read_at` | `readAt` | DB/types | Low | Adapter |

### 3b. Field Name Mismatches (different naming, not just casing)

| # | Concept | DB Field | App Type Field | Layers Affected | Risk | Fix Strategy |
|---|---|---|---|---|---|---|
| 17 | Channel name | `channel_name` | `name` | DB/types/hooks/UI | **High** | Adapter: `toAppChannel()` |
| 18 | Channel msg sender | `sender_id` (channel_messages) | `user_id` (ChannelMessage type) | DB/types/hooks | **High** | Adapter; rename app field to `senderId` |
| 19 | Chat msg sender | `user_id` (trip_chat_messages) | `sender_id` (Message type) | DB/types/hooks | **High** | Adapter; keep `senderId` in app |
| 20 | Accommodation name | `accommodation_name` | `label` | DB/types/hooks | **High** | Adapter: `toAppAccommodation()` |
| 21 | Calendar start | `start_time` (string) | `date` (Date) + `time` (string) | DB/types/hooks/UI | **High** | Adapter: split `start_time` into `date`+`time` |
| 22 | Calendar creator | `created_by` | `createdBy` | DB/types | Med | Adapter |
| 23 | Speaker avatar | `avatar_url` (event_lineup_members) | `avatar` (Speaker type) | DB/types | Med | Adapter |
| 24 | RSVP time | `rsvped_at` | `rsvpedAt` | DB/types | Low | Adapter |
| 25 | Unified msg sender | `user_id`/`author_name` | `senderId`/`senderName` | DB/types | Med | Adapter |
| 26 | Unified msg time | `created_at` | `timestamp` | DB/types | Med | Adapter |

### 3c. Inconsistent snake_case vs camelCase Within Same Layer

| # | Concept | File | Mixed Fields | Risk | Fix Strategy |
|---|---|---|---|---|---|
| 27 | PaymentMethod type | `src/types/payments.ts:7-17` | Has BOTH `displayName` AND `display_name`, `isPreferred` AND `is_preferred`, `type` AND `method_type` | **High** | Remove dual fields; use adapter |
| 28 | Tasks keep snake_case | `src/types/tasks.ts` | `trip_id`, `creator_id`, `due_at`, `is_poll` (all snake) | Med | Convert to camelCase in app type |
| 29 | Channels keep snake_case | `src/types/channels.ts` | `trip_id`, `created_by`, `is_archived` (all snake) | Med | Convert to camelCase in app type |
| 30 | Calendar mixed | `src/types/calendar.ts` | `include_in_itinerary`, `event_category`, `source_type` (snake) BUT `createdBy`, `creatorName` (camel) | **High** | Standardize to all camelCase |

### 3d. Duplicate/Conflicting Type Definitions

| # | Concept | File A | File B | Conflict | Risk | Fix Strategy |
|---|---|---|---|---|---|---|
| 31 | Message interface | `messages.ts` (line 6) | `messaging.ts` (line 2) | `sender_id` (snake) vs `senderId` (camel); different fields (isRead, isBroadcast, tourId in messaging.ts) | **High** | Consolidate into one canonical `Message` |
| 32 | TripCategory type | `enterprise.ts` (line 2) | `consumer.ts` (line 41) | Enterprise: legacy string labels; Consumer: `{id,label,color}` objects | Med | Enterprise uses `normalizeLegacyCategory()` already; deprecate enterprise TripCategory |
| 33 | SettlementData | `enterprise.ts` (line 48) | `pro.ts` (line 155) | Different fields entirely (finance vs per-diem) | Low | Rename one: `FinancialSettlement` vs `PerDiemSettlement` |
| 34 | ComplianceRule | `enterprise.ts` (line 66) | `pro.ts` (line 172) | Different `category` and `type` unions; Pro has `type` field, Enterprise has `category` field | Med | Unify to shared type with merged unions |

### 3e. Notification Type Fragmentation

| # | Source | File | Values | Risk |
|---|---|---|---|---|
| 35 | Backend canonical | `notificationUtils.ts` | `chat_messages`, `broadcasts`, `calendar_events`, `payments`, `tasks`, `polls`, `trip_invites`, `join_requests`, `basecamp_updates` (9) | Source of truth |
| 36 | Frontend service | `notificationService.ts` | `chat_message`, `itinerary_update`, `payment_request`, `payment_split`, `trip_reminder`, `trip_invite`, `poll_vote`, `task_assigned`, `broadcast`, `mention` (10) | **High** -- diverged naming |
| 37 | Mock notifications | `mockData/notifications.ts` | `message`, `broadcast`, `calendar`, `payment`, `task`, `poll`, `join_request`, `basecamp`, `photos` (9) | Med -- uses shortened/different names |
| 38 | DB constraint | `notifications_system.sql` | `broadcast`, `mention`, `chat`, `task`, `payment`, `calendar`, `invite`, `join_request`, `system` (9) | Med -- different from backend |

### 3f. Category/Enum Mismatches

| # | Concept | Source A | Source B | Conflict | Risk |
|---|---|---|---|---|---|
| 39 | Pro trip categories | `ProCategoryEnum`: `touring`, `sports`, `work`, `school`, `productions`, `celebrations`, `other` | `PRO_TRIP_CATEGORIES` in consumer.ts: `business-travel`, `school-trip`, `content`, `tour`, `sports-pro` | **High** -- IDs don't match enum values |
| 40 | Calendar event categories | CalendarEvent type: includes `food`, `accommodations`, `fitness`, `nightlife`, `attractions`, `budget` | categoryMapper.ts: maps these to `dining`, `lodging`, `activity`, `entertainment`, `other` | Med -- redundant categories requiring normalization |
| 41 | Permission naming | Trip: `can_view`, `can_post`, `can_edit_messages` (snake_case) | Event: `canView`, `canCreate`, `canEdit` (camelCase) | Med -- inconsistent casing |
| 42 | Medical log types | Enterprise: `injury`, `illness`, `treatment`, `checkup` | Pro: `injury`, `illness`, `checkup`, `therapy`, `medication` | Med -- Pro has extras |
| 43 | Medical log status | Enterprise: `active`, `resolved` | Pro: `active`, `resolved`, `monitoring` | Low -- Pro has extra status |
| 44 | Priority values | Messages: `urgent`, `reminder`, `fyi` | Pro schedule: `low`, `medium`, `high`, `critical` | Low -- different domains |

### 3g. Nullability Mismatches

| # | Field | DB Type | App Type | Risk |
|---|---|---|---|---|
| 45 | `is_settled` | `boolean \| null` | `boolean` (PaymentMessage) | **High** -- null coerced |
| 46 | `include_in_itinerary` | `boolean \| null` | `boolean` (CalendarEvent) | Med -- null coerced |
| 47 | `is_archived` | `boolean \| null` | `boolean` (TripChannel) | Med -- null coerced |

---

## 4) Source-of-Truth Gaps

### Currently Missing a Canonical Source:

| Concept | Current State | Proposed Source of Truth |
|---|---|---|
| **Notification categories** | 4 different enum definitions across backend, frontend, mock, and DB | Create `src/constants/notificationCategories.ts` with single canonical enum; backend imports from shared |
| **Calendar event categories** | 12 values in type union with 6 redundant aliases | Create `src/constants/calendarCategories.ts`; keep only canonical 6; adapter maps legacy |
| **Trip/event statuses** | Statuses scattered across multiple type files with no shared definition | Create `src/constants/statuses.ts` with per-entity status unions |
| **Permission keys** | Trip permissions (snake_case) and Event permissions (camelCase) defined inline in `roleChannels.ts` | Standardize to camelCase in a shared `src/constants/permissions.ts` |
| **Message types** | `type` field overloaded: `'text' \| 'broadcast' \| 'payment' \| 'system'` defined inline | Create `src/constants/messageTypes.ts` |
| **Payment confirmation status** | Inline union `'none' \| 'pending' \| 'confirmed'` in PaymentParticipant | Extract to `src/constants/paymentStatuses.ts` |
| **Settings keys** | Notification preference keys defined in 3 places (DB columns, backend type, frontend type) | Single source in `src/constants/notificationPreferenceKeys.ts` |
| **Pro category config** | Well-designed in `proCategories.ts` but `PRO_TRIP_CATEGORIES` in consumer.ts is a parallel diverged list | Delete `PRO_TRIP_CATEGORIES` from consumer.ts; use `proCategories.ts` exclusively |

---

## 5) Null/Undefined Category Analysis

### 5a. Null Category Bugs

| Location | Issue | Impact |
|---|---|---|
| `CalendarEvent.event_category` | DB allows `null`; app type requires one of 12 values (no `null` in union) | Events with null category will fail type checks or render as `undefined` |
| `notification_history.notification_type` | DB CHECK constraint doesn't include `'polls'` or `'basecamp_updates'` | Poll/basecamp notifications may fail DB insert |
| `trip_chat_messages.message_type` | DB allows `null`; no default value | Messages without explicit type become `null`, not `'text'` |

### 5b. Unmapped Categories

| Location | Issue |
|---|---|
| `PRO_TRIP_CATEGORIES` IDs (`business-travel`, `school-trip`, `content`, `tour`, `sports-pro`) | These kebab-case IDs are never mapped to `ProCategoryEnum` values; any code using these IDs against the DB will fail silently |
| Mock notification type `'photos'` | No mapping to any backend notification category; would be lost in normalization |
| Calendar categories `food`, `accommodations`, `fitness`, `nightlife`, `attractions`, `budget` | These are "alias" categories that must pass through `categoryMapper.ts` to be stored; direct use bypasses normalization |

### 5c. Missing Enum Values / Switch Default Fallthroughs

| Location | Issue |
|---|---|
| `notificationUtils.ts` TYPE_TO_CATEGORY_MAP | Missing: `trip_reminder` (used in frontend NotificationType) will fall through to `null` category |
| Frontend `NotificationType` | Has `trip_reminder` type with no backend mapping -- notifications of this type will have `null` category |
| `WellnessEntry.type` in enterprise.ts | Missing `therapy` and `medication` (present in pro.ts); enterprise wellness entries with these types will fail type validation |

### 5d. Unsafe Assumptions in Hooks

| Hook | Issue |
|---|---|
| `usePayments.ts` | Converts `is_settled` (nullable boolean) to `isSettled` (boolean) -- `null` becomes `false` implicitly via JS falsy coercion |
| `useCalendarEvents.ts` | Sets `event_category` default to `'other'` via `\|\|` fallback -- safe but undocumented |
| `useTripChat.ts` | Filters `is_deleted` messages but `is_deleted` is nullable -- `null` is treated as not-deleted (correct but fragile) |
| `useChannels.ts` | Maps `channel_id` to `id` silently -- if channel_id is undefined, produces `{id: undefined}` |

---

## 6) Regression-Safe Implementation Plan

### Phase 1: Foundation (No Breaking Changes)

**Goal:** Create adapter layer and canonical constants without changing any existing behavior.

**Step 1.1: Create canonical constant files**
- `src/constants/notificationCategories.ts` -- single enum for all notification categories
- `src/constants/calendarCategories.ts` -- canonical 6 categories + alias map
- `src/constants/messageTypes.ts` -- message type union
- `src/constants/statuses.ts` -- per-entity status unions

**Step 1.2: Create entity adapter utilities**
- `src/lib/adapters/paymentAdapter.ts` -- `toAppPayment(dbRow)` / `toDbPayment(appObj)`
- `src/lib/adapters/calendarAdapter.ts` -- `toAppCalendarEvent(dbRow)` / `toDbCalendarEvent(appObj)`
- `src/lib/adapters/channelAdapter.ts` -- `toAppChannel(dbRow)` / `toAppChannelMessage(dbRow)`
- `src/lib/adapters/messageAdapter.ts` -- `toAppMessage(dbRow)` / `toUnifiedMessage(dbRow)`
- `src/lib/adapters/accommodationAdapter.ts` -- `toAppAccommodation(dbRow)`
- `src/lib/adapters/organizationAdapter.ts` -- `toAppOrganization(dbRow)`

Each adapter:
- Handles snake_case -> camelCase conversion
- Handles nullability (explicit coercion with documented defaults)
- Is fully typed: input = DB Row type, output = App type
- Has unit tests

**Step 1.3: Fix `PaymentMethod` dual-field anti-pattern**
- Remove `display_name`, `is_preferred`, `method_type` snake_case fields from PaymentMethod interface
- Add adapter for DB -> app conversion
- Update any code that reads the snake_case fields

### Phase 2: Type Hardening (Backward-Compatible)

**Step 2.1: Fix nullability in app types**
- `PaymentMessage.isSettled: boolean | null` (match DB)
- `TripChannel.isArchived: boolean | null` (match DB)
- `CalendarEvent.includeInItinerary: boolean | null` (match DB)
- Add explicit null checks in components that consume these

**Step 2.2: Consolidate duplicate Message types**
- Keep `src/types/messages.ts` as canonical (it has the more complete `UnifiedMessage`)
- Deprecate `src/types/messaging.ts` -- re-export from `messages.ts` with `@deprecated` JSDoc
- Update all imports to use `messages.ts`

**Step 2.3: Standardize CalendarEvent type to full camelCase**
- Rename `event_category` -> `eventCategory`
- Rename `include_in_itinerary` -> `includeInItinerary`
- Rename `source_type` -> `sourceType`
- Rename `source_data` -> `sourceData`
- Rename `parent_event_id` -> `parentEventId`
- Rename `recurrence_rule` -> `recurrenceRule`
- Rename `recurrence_exceptions` -> `recurrenceExceptions`
- Rename `is_busy` -> `isBusy`
- Rename `availability_status` -> `availabilityStatus`
- Rename `end_time` -> `endTime`
- Update all consumers via adapter

**Step 2.4: Standardize TripTask type to camelCase**
- `trip_id` -> `tripId`, `creator_id` -> `creatorId`, `due_at` -> `dueAt`
- `is_poll` -> `isPoll`, `created_at` -> `createdAt`, `updated_at` -> `updatedAt`
- Update TaskStatus: `task_id` -> `taskId`, `user_id` -> `userId`, `completed_at` -> `completedAt`
- Wire through adapter

**Step 2.5: Standardize TripChannel type to camelCase**
- `trip_id` -> `tripId`, `created_by` -> `createdBy`, `created_at` -> `createdAt`
- `updated_at` -> `updatedAt`, `is_archived` -> `isArchived`
- `channel_type` -> `channelType`, `role_filter` -> `roleFilter`
- Wire through adapter

**Step 2.6: Fix `PRO_TRIP_CATEGORIES` in consumer.ts**
- Delete `PRO_TRIP_CATEGORIES` constant
- Replace any usages with `PRO_CATEGORIES_ORDERED` from `proCategories.ts`
- This prevents the kebab-case ID mismatch

### Phase 3: Notification Unification

**Step 3.1: Create shared notification category source**
- `src/constants/notificationCategories.ts` exports the canonical 9 categories
- Backend `notificationUtils.ts` imports from shared (or duplicates with a matching-test)
- Frontend `notificationService.ts` NotificationType maps to canonical via lookup
- Mock data uses canonical enum values

**Step 3.2: Add `trip_reminder` mapping**
- Add `trip_reminder` -> `calendar_events` in backend TYPE_TO_CATEGORY_MAP
- This prevents null-category bugs for frontend-originated trip reminders

**Step 3.3: Align mock notification types**
- Change mock `'message'` -> `'chat_message'`
- Change mock `'calendar'` -> `'calendar_event'`
- Change mock `'basecamp'` -> `'basecamp_update'`
- Change mock `'photos'` -> `'media'` (or remove if not a real notification category)

### Phase 4: Permission Standardization

**Step 4.1: Unify permission naming to camelCase**
- Trip `FeaturePermissions`: `can_view` -> `canView`, `can_post` -> `canPost`, etc.
- This is internal-only (not stored in DB), so no migration needed
- Update all consumers

### Phase 5: Cleanup

**Step 5.1: Remove dead dual-field patterns**
- Remove deprecated `ProTripCategory` type alias after all references are gone
- Remove `messaging.ts` file after all imports redirected
- Remove legacy `TripCategory` from enterprise.ts if no longer used
- Remove redundant calendar categories from the union type (keep only canonical 6)

**Step 5.2: Add missing DB fields to app types**
- Add `version` to payment, calendar, task types (needed for optimistic concurrency)
- Add `accommodation_type`, `check_in`, `check_out` to UserAccommodation
- Add `is_private`, `required_role_id`, `archived_at` to TripChannel

---

## 7) Test Plan & QA Checklist

### Automated Tests
- [ ] Unit tests for every adapter function (input DB row -> expected app type)
- [ ] Unit tests for null/undefined handling in adapters
- [ ] Unit tests for notification category normalization (all 10+ input types map correctly)
- [ ] Unit tests for `normalizeLegacyCategory()` with all known legacy strings
- [ ] Compile-time check: `npm run typecheck` passes after every phase

### Manual QA Checklist
- [ ] Trip chat: send message, verify it renders with correct sender info
- [ ] Payments: create split, verify amounts and participants display correctly
- [ ] Calendar: create event, verify category and time display correctly
- [ ] Tasks: create task, toggle completion, verify status updates
- [ ] Channels: create channel, send message, verify sender name shows
- [ ] Notifications: trigger each category, verify toast/push/email content
- [ ] Accommodations: add accommodation, verify name and address display
- [ ] Pro trips: create trip with category, verify category label shows
- [ ] Join requests: submit and approve, verify name resolution
- [ ] Settings: toggle notification preferences, verify persistence

### Build Verification
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] No new `any` types introduced

---

## 8) Follow-Up Recommendations (Prevention)

### 8.1 Shared Typed Adapters (Implemented in Phase 1)
Every Supabase query result passes through an adapter. No raw DB rows in components.

### 8.2 Schema Validation at Boundaries
- Add Zod schemas for edge function request/response payloads
- Validate notification payloads at creation time (not just normalization)

### 8.3 Lint Rules
- ESLint rule to warn on snake_case property access in `.tsx` files (components should only see camelCase)
- ESLint rule to prevent duplicate type exports (same name in multiple files)

### 8.4 Generated Types from DB Schema
- Already using Supabase CLI to generate `types.ts`
- Add a CI step that fails if generated types differ from checked-in types (drift detection)

### 8.5 Adapter Shape Tests
- For each entity, add a test that verifies the adapter output shape matches the app type interface
- This catches drift between DB schema updates and app types

### 8.6 Feature-Level Canonical Field Maps
- Each feature directory should have a `constants.ts` that exports its canonical field names, statuses, and categories
- No hardcoded string literals in components

### 8.7 Deprecation Checklist for Renames
When renaming a field:
1. Add the new field to the type
2. Add the old field as `@deprecated`
3. Update adapter to populate both
4. Grep and update all consumers of old field
5. Remove old field
6. Remove adapter dual-population
7. Run full test suite

---

## 9) Files Changed Summary (For Implementation)

### New Files to Create:
- `src/constants/notificationCategories.ts`
- `src/constants/calendarCategories.ts`
- `src/constants/messageTypes.ts`
- `src/constants/statuses.ts`
- `src/lib/adapters/paymentAdapter.ts`
- `src/lib/adapters/calendarAdapter.ts`
- `src/lib/adapters/channelAdapter.ts`
- `src/lib/adapters/messageAdapter.ts`
- `src/lib/adapters/accommodationAdapter.ts`
- `src/lib/adapters/organizationAdapter.ts`

### Files to Modify:
- `src/types/payments.ts` -- remove dual snake/camel fields from PaymentMethod
- `src/types/calendar.ts` -- standardize to camelCase
- `src/types/tasks.ts` -- standardize to camelCase
- `src/types/channels.ts` -- standardize to camelCase; add missing DB fields
- `src/types/messages.ts` -- add missing fields (sentiment, message_type, etc.)
- `src/types/messaging.ts` -- deprecate, re-export from messages.ts
- `src/types/consumer.ts` -- remove PRO_TRIP_CATEGORIES
- `src/types/accommodations.ts` -- add missing DB fields
- `src/types/roleChannels.ts` -- standardize permission naming
- `src/services/notificationService.ts` -- use canonical enum
- `src/mockData/notifications.ts` -- align type names
- `src/hooks/usePayments.ts` -- use adapter
- `src/hooks/useTripTasks.ts` -- use adapter
- `src/hooks/useChannels.ts` -- use adapter
- `src/features/calendar/hooks/useCalendarEvents.ts` -- use adapter
- `src/hooks/useAccommodations.ts` -- use adapter

### Files to Delete (Phase 5):
- `src/types/messaging.ts` (after all imports migrated)

### No Database Migrations Required
All changes are in the TypeScript/application layer. DB schema stays as-is (snake_case). Adapters bridge the gap.

---

## Regression Risk: LOW-MEDIUM
## Rollback Strategy: Each phase is independently revertible; adapters can be bypassed by reverting to direct DB field access; no DB migrations to undo.
