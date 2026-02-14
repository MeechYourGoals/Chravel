
# Add Admin Tab to Events + Admin Dashboard + Fix Build Errors

## Overview

This plan adds an "Admin" tab as the first tab in Events, reorders the remaining tabs alphabetically, builds out the Admin dashboard with real DB-backed toggles, and fixes the 25+ build errors in `dispatch-notification-deliveries` and `demo-concierge`.

---

## Part 1: Fix Build Errors (2 files)

### A. `supabase/functions/demo-concierge/index.ts` (2 errors)
- Lines 119 and 131: Add explicit `(item: any)` type annotations to `.map()` and `.filter()` callbacks.

### B. `supabase/functions/dispatch-notification-deliveries/index.ts` (23 errors)
All errors stem from `ReturnType<typeof createClient>` resolving to a strict generic that causes `never` inference for table operations.

**Fix:** Change the `supabase` parameter type in `markDelivery` (line 178) and `logDeliveryAttempt` (line 189) from `ReturnType<typeof createClient>` to `any`. This is safe because both functions only call standard `.from().update()` and `.from().insert()` methods. This single change at the function signature level resolves all 23 downstream call-site errors without touching any other lines.

---

## Part 2: Add Admin Tab + Reorder Events Tabs

### New tab order (alphabetical after Admin)
```
admin, agenda, calendar, chat, lineup, media, polls, tasks
```

### Files modified

**`src/hooks/useFeatureToggle.ts`**
- Add `'admin'` to `EVENT_FEATURES` array (first position)
- Add `showAdmin: enabledFeatures.includes('admin')` to return object

**`src/lib/tabParity.ts`**
- Update `EVENT_PARITY_ROW_CLASS` to 8 columns (was 7)
- Update `EVENT_PARITY_HEADER_SPAN_CLASS` to `md:col-span-7` (was 6)
- Update `EVENT_PARITY_COL_START` to include `admin: 'md:col-start-1'` and shift all others by 1

**`src/components/events/EventDetailContent.tsx`** (desktop)
- Import `Shield` icon from lucide-react
- Lazy-load new `EventAdminTab` component
- Add `admin` tab to the tabs array (first position, enabled only for organizers via `isOrganizer`)
- Add `case 'admin'` to `renderTabContent()` switch
- Reorder tabs: admin, agenda, calendar, chat, lineup, media, polls, tasks

**`src/components/mobile/MobileTripTabs.tsx`** (mobile)
- Import `Shield` icon
- Lazy-load `EventAdminTab`
- Add `admin` tab to event variant in `getTabsForVariant()` (first position, enabled for event admins)
- Add `case 'admin'` to `renderTabContent()` switch
- Reorder event tabs to match new order

**`src/pages/EventDetail.tsx`** + **`src/pages/MobileEventDetail.tsx`**
- Change default `activeTab` from `'chat'` to `'admin'` for organizers (or keep `'agenda'` for attendees -- will default to `'agenda'` since admin tab is organizer-only)

---

## Part 3: Event Admin Dashboard Component

### New file: `src/components/events/EventAdminTab.tsx`

A clean, card-based admin dashboard with four sections:

**Section 1: Event Visibility**
- Toggle between Public / Private
- Public: "Anyone with the link can join instantly"
- Private: "Join requests must be approved by an organizer"
- Reads/writes `trips.privacy_mode` column (already exists: `'standard'` maps to public, `'high'` maps to private)

**Section 2: Tab Toggles**
- List of toggleable tabs: Agenda (always on, disabled toggle), Calendar, Chat, Line-up, Media, Polls, Tasks
- Each row: icon + label + Switch toggle
- Reads/writes `trips.enabled_features` array column (already exists in DB)
- `'agenda'` is always included and cannot be toggled off

**Section 3: Attendees and Join Requests**
- Shows attendee count + scrollable list of current members (from `trip_members`)
- If private mode: shows pending join requests from `trip_join_requests` with Approve / Deny buttons
- Reuses existing `useJoinRequests` hook and `approve_join_request` / `dismiss_join_request` DB functions

**Section 4: Permissions (placeholder)**
- Static rows showing future permission controls:
  - "Chat mode: Broadcast-only (Free) / Full chat (Pro)"
  - "Media uploads: Admin-only (Free) / Admin + Allowed attendees (Pro)"
- Grayed out with "Coming Soon" badge (visible only to organizers, not standard users per production-ui-visibility-policy -- this is fine since the entire Admin tab is organizer-only)

### Data model
No new tables needed. Everything maps to existing infrastructure:

| Feature | Existing DB Column/Table |
|---------|------------------------|
| Visibility | `trips.privacy_mode` ('standard' = public, 'high' = private) |
| Tab toggles | `trips.enabled_features` (string array) |
| Attendees | `trip_members` table |
| Join requests | `trip_join_requests` table |
| Organizer check | `trip_admins` table + `useEventPermissions` hook |

---

## Part 4: New Hook for Admin Tab Data

### New file: `src/hooks/useEventAdmin.ts`

Encapsulates all admin dashboard state:
- Fetches `trips.privacy_mode` and `trips.enabled_features`
- Provides `toggleVisibility()` mutation (updates `trips.privacy_mode`)
- Provides `toggleFeature(featureId)` mutation (updates `trips.enabled_features` array)
- Fetches `trip_members` list with profile data
- Delegates join request logic to existing `useJoinRequests` hook

---

## Implementation Order

1. Fix build errors in `demo-concierge` and `dispatch-notification-deliveries` (type annotations)
2. Update `useFeatureToggle.ts` and `tabParity.ts` for 8-column event layout
3. Create `useEventAdmin.ts` hook
4. Create `EventAdminTab.tsx` component
5. Update `EventDetailContent.tsx` (desktop tabs)
6. Update `MobileTripTabs.tsx` (mobile tabs)
7. Deploy updated edge functions

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/demo-concierge/index.ts` | Add `any` type to `.map` / `.filter` callbacks |
| `supabase/functions/dispatch-notification-deliveries/index.ts` | Change `markDelivery` and `logDeliveryAttempt` param types to `any` |
| `src/hooks/useFeatureToggle.ts` | Add `admin` to `EVENT_FEATURES`, add `showAdmin` |
| `src/lib/tabParity.ts` | Update event parity to 8 columns with admin |
| `src/hooks/useEventAdmin.ts` | **NEW** -- admin dashboard data hook |
| `src/components/events/EventAdminTab.tsx` | **NEW** -- admin dashboard UI |
| `src/components/events/EventDetailContent.tsx` | Add admin tab, reorder tabs |
| `src/components/mobile/MobileTripTabs.tsx` | Add admin tab, reorder event tabs |
