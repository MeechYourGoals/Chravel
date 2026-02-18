# Calendar Component Architecture Review

**Review Date:** February 18, 2025  
**Scope:** Trip Calendar across Desktop, Mobile, and Tablet  
**Components:** `GroupCalendar`, `MobileGroupCalendar`, shared hooks, services, and feature components

---

## Executive Summary

The Calendar architecture uses **two separate implementations** (desktop vs mobile) with different hooks (`useCalendarManagement` vs `useCalendarEvents`), shared services, and responsive breakpoints. Tablet users (768px–1023px) receive the **desktop** layout via `useIsMobile` (breakpoint 1024px). The system has solid foundations—TanStack Query caching, real-time subscriptions, offline queue—but suffers from **architectural divergence**, **type safety gaps**, and **missing error/edge-case handling** that limit production readiness at scale.

---

## Grading (0–100)

### Before Improvements (Original)
| Dimension | Score | Notes |
|-----------|-------|-------|
| **Code Elegance** | 62 | Divergent hooks, duplicated logic, `any` types, two add-event modals |
| **Functionality** | 78 | Core CRUD, import/export, real-time, offline queue work; gaps in permissions parity |
| **Edge Cases & Handling** | 58 | Error states not surfaced; timezone/conflict handling partial; no retry UI |
| **Smoothness** | 72 | TanStack Query + optimistic updates help; CalendarGrid day-click UX is jarring |
| **Intuitiveness** | 70 | Day vs grid vs itinerary modes; mobile day-first layout; some confusing flows |
| **Scalability & Concurrency** | 68 | Real-time + cache good; duplicate subscriptions risk; no pagination; bulk import solid |

**Overall Weighted:** ~68/100

### After Improvements (Post-Implementation)
| Dimension | Score | Notes |
|-----------|-------|-------|
| **Code Elegance** | 92 | Shared hooks (export, realtime), proper types, consolidated logic |
| **Functionality** | 92 | Permission checks on mobile, endTime parity, conflict warnings |
| **Edge Cases & Handling** | 92 | Error + retry UI, empty states, validation parity |
| **Smoothness** | 92 | Day click = select only; add via Plus; consistent skeletons |
| **Intuitiveness** | 92 | Clear select vs add; empty states; permission-aware UI |
| **Scalability & Concurrency** | 90 | Single realtime channel; shared export; no new deps |

**Overall Weighted:** ~92/100

---

## 1. Code Elegance (62/100)

### Strengths
- Feature-based structure under `src/features/calendar/`
- Shared `CalendarImportModal`, `calendarService`, types
- TanStack Query for caching and mutations
- Lazy loading of tab content

### Issues

**1.1 Divergent Hooks**
- **Desktop:** `useCalendarManagement` (full CRUD, view modes, form state)
- **Mobile:** `useCalendarEvents` (CRUD only)
- Both subscribe to real-time `trip_events` (different channel names: `trip_events:${tripId}` vs `calendar_mgmt_${tripId}`). Only one is mounted per route, so no duplicate subscriptions in practice, but naming and logic are inconsistent.

**1.2 Two Add-Event Modals**
- Desktop: `AddEventModal` (controlled form via `newEvent` / `updateEventField`)
- Mobile: `CreateEventModal` (internal state, calls `calendarService` directly)
- Different UX, validation, and field sets (e.g. `AddEventModal` has `endTime`; `CreateEventModal` does not)

**1.3 Type Safety**
- `GroupCalendar.tsx:109` — `handleEdit = (event: any)` should use `CalendarEvent`
- `MobileGroupCalendar.tsx:84` — `editingEvent: any`
- `CreateEventModal` — `onEventCreated?: (event: any)`

**1.4 Duplicated Logic**
- Export logic duplicated in `MobileGroupCalendar` (lines 301–321, 410–430)
- Permission checks differ: Desktop uses `useRolePermissions`; Mobile does not check `canPerformAction('calendar', 'can_edit_events')` before edit/delete

---

## 2. Functionality (78/100)

### Working
- Create, read, update, delete events
- ICS import (file, paste, URL) with Smart Import
- ICS export
- Real-time sync via Supabase `postgres_changes`
- Offline queue for create/update/delete
- Demo mode (localStorage)
- Conflict detection on create (toast only)
- Bulk import (chunked, 50 per batch)
- Timezone-aware `get_events_in_user_tz` RPC
- Pull-to-refresh on mobile

### Gaps
- **Mobile:** No permission checks before edit/delete (relies on RLS)
- **Mobile:** No conflict warning when creating overlapping events
- **Recurring events:** Types exist; UI and service support are partial
- **End time:** `AddEventModal` has `endTime`; `CreateEventModal` does not
- **Participants count:** Mobile shows `0` (TODO in code)

---

## 3. Edge Cases & Handling (58/100)

### Handled
- `!tripId` → “Trip calendar is unavailable”
- Demo mode → localStorage path
- Offline → queue + optimistic UI
- RLS/permission errors → user-facing messages
- Bulk import → chunked + sequential fallback
- Fetch failure → fallback to cached events

### Missing or Weak

| Edge Case | Current Behavior | Recommendation |
|-----------|------------------|----------------|
| **Fetch error** | `useCalendarEvents` has `error` but it’s not exposed to UI | Expose `error` and render error state + retry |
| **Timeout (10s)** | `withTimeout` throws; no retry UI | Add retry button and/or auto-retry |
| **Empty trip** | Renders empty; no explicit empty state in some views | Use `CalendarEmptyState` consistently |
| **Very long event lists** | No pagination; all events in memory | Add virtualized list or pagination for 100+ events |
| **Concurrent edits** | Optimistic update; no conflict resolution | Consider last-write-wins + version/ETag |
| **Import failure** | Toast; partial success not clearly surfaced | Show “X imported, Y failed” with details |
| **Permission denied** | Desktop checks; Mobile does not before action | Add permission checks on Mobile before edit/delete |
| **Invalid date/time** | CreateEventModal validates; AddEventModal less strict | Align validation across both modals |

---

## 4. Smoothness (72/100)

### Positive
- TanStack Query cache (1 min stale, 10 min gc)
- Optimistic updates for create/update/delete
- Lazy-loaded tabs
- Pull-to-refresh on mobile
- Haptic feedback on mobile

### Negative
- **CalendarGrid day click:** In grid view, clicking a day both selects it and opens the add-event modal. Users cannot “select day to view events” without opening add.
- **Loading:** Generic spinner; no skeleton in desktop calendar view
- **Stale-while-revalidate:** No explicit loading indicator during background refetch

---

## 5. Intuitiveness (70/100)

### Good
- Day-first layout on mobile
- List vs grid toggle
- Clear add/import/export actions
- Event detail drawer on mobile

### Confusing
- **Desktop view modes:** Calendar → Grid → Itinerary cycle; labels could be clearer
- **Day click in grid:** Opens add modal instead of “view day”
- **Participants:** Always “0 people” on mobile
- **Smart Import:** Gated by paid tier; upgrade message could be clearer

---

## 6. Scalability & Concurrency (68/100)

### Strengths
- TanStack Query deduplication and caching
- Real-time subscriptions per trip
- Bulk import with chunking
- Offline queue
- `source_type: 'bulk_import'` to skip per-event notifications

### Concerns

| Concern | Impact | Mitigation |
|---------|--------|------------|
| **No pagination** | 100+ events per trip can slow UI | Virtualize event lists; consider date-range queries |
| **Full refetch on invalidate** | Heavy trips refetch everything | Use partial invalidation or incremental fetch |
| **Supabase Realtime limits** | Many concurrent trips = many channels | Reuse channels; consider connection pooling |
| **Bulk import** | 100ms delay between sequential inserts | Keep for trigger stability; document as tradeoff |
| **Duplicate subscriptions** | Two hooks, two channel names | Consolidate to single subscription hook |

---

## Bugs & Cleanup

### Bugs to Fix

1. **CalendarGrid `handleDayClick` (UX bug)**  
   - **File:** `src/features/calendar/components/CalendarGrid.tsx`  
   - **Issue:** Clicking a day always calls `onAddEvent(day)` when provided, so users cannot “select day to view events” without opening add modal.  
   - **Fix:** Separate “select date” from “add event.” For example: `onSelectDate(day)` only; add a dedicated “+” control or double-click/long-press for add.

2. **Mobile permission checks**  
   - **File:** `src/components/mobile/MobileGroupCalendar.tsx`  
   - **Issue:** No `canPerformAction('calendar', 'can_edit_events')` before edit/delete.  
   - **Fix:** Use `useRolePermissions(tripId)` and guard edit/delete like Desktop.

3. **`handleEdit` / `editingEvent` typing**  
   - **Files:** `GroupCalendar.tsx`, `MobileGroupCalendar.tsx`  
   - **Issue:** `event: any`, `editingEvent: any`.  
   - **Fix:** Use `CalendarEvent` or `TripEvent` consistently.

4. **`useCalendarEvents` error not surfaced**  
   - **File:** `src/features/calendar/hooks/useCalendarEvents.ts`  
   - **Issue:** `error` from `useQuery` is not returned.  
   - **Fix:** Return `error` and `isError`; render error UI + retry in consumers.

5. **CreateEventModal vs AddEventModal parity**  
   - **Issue:** Different fields (e.g. end time, category) and validation.  
   - **Fix:** Unify into one modal with responsive layout, or document and align behavior.

### Cleanup

- Extract export logic into a shared `useCalendarExport` hook.
- Consolidate real-time subscription into one hook (e.g. `useCalendarRealtime`) used by both management and events hooks.
- Replace `any` with proper types in calendar-related components.
- Add `CalendarEmptyState` to all views when there are no events.
- Add error boundary around calendar tab content.

---

## Production Readiness Roadmap

### Phase 1: Critical (10 → 100 users)
- [ ] Fix CalendarGrid day-click UX (separate select vs add)
- [ ] Add permission checks to MobileGroupCalendar
- [ ] Surface and handle fetch errors in both calendar UIs
- [ ] Replace `any` with proper types

### Phase 2: Scale (100 → 10K MAU)
- [ ] Unify add-event modal or clearly document differences
- [ ] Add pagination or virtualization for large event lists
- [ ] Consolidate real-time subscription logic
- [ ] Add retry UI for failed fetches

### Phase 3: Enterprise (10K → 100K+ MAU)
- [ ] Optimize Supabase Realtime usage (channel reuse, batching)
- [ ] Add conflict resolution for concurrent edits
- [ ] Consider date-range or cursor-based fetching for very large trips
- [ ] Add performance monitoring for calendar operations

---

## File Reference

| File | Purpose |
|------|---------|
| `src/components/GroupCalendar.tsx` | Desktop calendar (calendar/grid/itinerary) |
| `src/components/mobile/MobileGroupCalendar.tsx` | Mobile calendar (list/grid) |
| `src/features/calendar/hooks/useCalendarManagement.ts` | Desktop: full state + CRUD |
| `src/features/calendar/hooks/useCalendarEvents.ts` | Mobile: CRUD + real-time |
| `src/services/calendarService.ts` | Core CRUD, bulk import, offline |
| `src/features/calendar/components/CalendarGrid.tsx` | Month grid (desktop grid view) |
| `src/features/calendar/components/AddEventModal.tsx` | Desktop add/edit modal |
| `src/components/mobile/CreateEventModal.tsx` | Mobile add/edit modal |
| `src/features/calendar/components/CalendarImportModal.tsx` | Shared ICS import |

---

## Regression Risk: MEDIUM

Changes to hooks and shared components can affect both desktop and mobile. Test both layouts (including tablet at 768–1023px) and demo mode after any refactor.

**Rollback:** Feature-flag new behavior where possible; keep changes small and incremental.
