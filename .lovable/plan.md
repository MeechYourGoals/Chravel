# Trip Tab Performance & Bounce-Back Fix Plan

## ✅ COMPLETED - 2026-01-29

All fixes from this plan have been implemented successfully.

---

## Summary of Changes

### 1. Per-Tab Error Boundaries (Critical Fix)
**Files Modified:**
- `src/components/mobile/MobileTripTabs.tsx`
- `src/components/TripTabs.tsx` (desktop)
- `src/components/pro/ProTabContent.tsx` (pro trips)

**Before:** Single `ErrorBoundary` wrapped ALL tab content. When one tab failed, the error reset would bounce users back to the default "chat" tab.

**After:** Each tab now has its own `FeatureErrorBoundary`. If Concierge fails, you stay on the Concierge tab and see "Something went wrong in AI Concierge" with a retry button. Other tabs remain functional.

---

### 2. Payment Tab Timeout (10 seconds)
**File:** `src/components/mobile/MobileTripPayments.tsx`

**Before:** If Supabase query hung, spinner showed indefinitely.

**After:** 10-second timeout shows fallback UI with "Taking longer than expected" message and Retry button.

---

### 3. Concierge Initialization Timeout (8 seconds)
**File:** `src/components/AIConciergeChat.tsx`

**Before:** AI Concierge could wait indefinitely for API health check.

**After:** 8-second timeout sets `aiStatus` to `'timeout'` with user-facing feedback.

---

### 4. Content-Aware Tab Skeletons
**Files Modified:**
- `src/components/mobile/MobileTripTabs.tsx`
- `src/components/TripTabs.tsx`
- `src/components/pro/ProTabContent.tsx`

**Before:** Generic spinner skeleton for all tabs.

**After:** Tab-specific skeletons:
- Calendar tab → `CalendarSkeleton` (grid layout)
- Chat tab → `ChatSkeleton` (message bubbles)
- Places tab → `PlacesSkeleton` (map + list)
- Others → Default spinner

---

## Expected Outcomes

1. ✅ **No more "bounce back to chat"** - errors stay on the tab that failed
2. ✅ **No more indefinite spinners** - 10s timeout shows retry UI
3. ✅ **Better perceived performance** - content-aware skeletons reduce "white flash"
4. ✅ **Clear error feedback** - users see which feature failed and can retry

---

## Verification Checklist

- [ ] Click Concierge → if API fails, error stays on Concierge tab
- [ ] Click Payments → if slow, shows retry after 10s
- [ ] Click Places → shows PlacesSkeleton (map-like grid)
- [ ] Switch between tabs rapidly → no white flashes
- [ ] Test on mobile viewport → same behavior as desktop
