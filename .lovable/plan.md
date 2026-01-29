
# Tab Loading Race Condition & Google Maps Fix Plan

## Root Cause Analysis

I've identified **two distinct issues** causing the symptoms you're describing:

---

### Issue 1: "Click Away and Back to Load" - Race Condition in `visitedTabs`

**The Problem:**

When you click a tab for the first time, here's what happens:

```text
1. onClick fires → onTabChange(tabId) is called
2. Parent component re-renders with new activeTab
3. MobileTripTabs receives new activeTab prop
4. useEffect sees activeTab changed, updates visitedTabs Set
5. On NEXT render, tab content is mounted (because hasBeenVisited is now true)
```

The bug: **The render that first sets `activeTab` to the new tab doesn't yet have that tab in `visitedTabs`** - that only happens after the `useEffect` runs and triggers a second render.

This causes:
- **First render:** `hasBeenVisited = false` → return null (nothing renders)
- **useEffect runs:** adds tab to visitedTabs
- **Second render:** `hasBeenVisited = true` → content mounts
- **Meanwhile:** The Suspense fallback flashes, then the lazy component loads, then data fetches begin

When you click away and back, the tab is already in `visitedTabs`, so it renders immediately on first render.

---

### Issue 2: Google Maps "Oops! Something went wrong"

**The Problem:**

Your screenshot shows the Google Maps error overlay. This happens when:
1. The Maps JavaScript API fails to authenticate (API key issue)
2. Required APIs not enabled (Places API, Maps JavaScript API)
3. Billing not enabled on the Google Cloud project

The `MapCanvas` component has an 8-second timeout fallback, but the fallback iframe embed is also failing because the same API key issues affect it.

---

## The Fixes

### Fix 1: Synchronous Tab Mounting (Critical)

**Problem:** `visitedTabs` update is async (via useEffect), causing a render-before-mount race.

**Solution:** Update `visitedTabs` synchronously during render, not in useEffect.

**File:** `src/components/mobile/MobileTripTabs.tsx`

**Current (broken):**
```tsx
const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

useEffect(() => {
  if (!visitedTabs.has(activeTab)) {
    setVisitedTabs(prev => new Set([...prev, activeTab]));
  }
}, [activeTab, visitedTabs]);
```

**Fixed:**
```tsx
const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

// ⚡ CRITICAL: Update synchronously during render, not async in useEffect
// This prevents the "click away and back" loading bug
if (!visitedTabs.has(activeTab)) {
  // Mutate directly during render to avoid extra render cycle
  visitedTabs.add(activeTab);
}
```

Wait - that's not quite right either because it mutates state. Here's the correct pattern:

```tsx
// Track visited tabs - use a ref + force update pattern for synchronous updates
const visitedTabsRef = useRef<Set<string>>(new Set([activeTab]));
const [, forceUpdate] = useState(0);

// Synchronously mark tab as visited BEFORE render
if (!visitedTabsRef.current.has(activeTab)) {
  visitedTabsRef.current.add(activeTab);
}

// ... in render:
const hasBeenVisited = visitedTabsRef.current.has(tab.id);
```

OR simpler - just always mount the current tab:

```tsx
// Always render the active tab, even if not yet in visitedTabs
const shouldMount = isActive || visitedTabs.has(tab.id);
if (!shouldMount) return null;
```

---

### Fix 2: Apply Same Fix to Desktop TripTabs

**File:** `src/components/TripTabs.tsx`

Same pattern - ensure the active tab always mounts immediately.

---

### Fix 3: Apply Same Fix to MountedTabs Utility

**File:** `src/components/trip/MountedTabs.tsx`

Same pattern - synchronous mounting for active tab.

---

### Fix 4: Fix Google Maps API Error Detection

**File:** `src/components/places/MapCanvas.tsx`

The current code checks for `.gm-err-container` every 500ms for 3 seconds. If detected, it shows an error but the fallback embed also fails.

**Improvement:** Show a more actionable error message and ensure the iframe fallback uses a different approach that works without API key auth (like OpenStreetMap embed).

---

## Technical Details

### Why "Click Away and Back" Works

When you:
1. Click tab A (first time) → race condition, tab doesn't render
2. Click tab B → now tab A is in visitedTabs from the useEffect
3. Click tab A again → tab A is already in visitedTabs, renders immediately

The useEffect from step 1 ran after you clicked away, so when you come back, it's ready.

### Why Some Tabs Load Faster

Tabs that use simpler components (like Polls which is just `CommentsWall`) load faster because:
- Smaller lazy chunk
- Simpler data fetching
- No external API dependencies (like Google Maps)

### The Google Maps Specific Issue

Places tab has an 8-second timeout, but:
1. If API auth fails, it falls back to iframe embed
2. Iframe embed uses same API key, also fails
3. Error overlay appears: "Oops! Something went wrong"

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/mobile/MobileTripTabs.tsx` | Synchronous tab mounting |
| `src/components/TripTabs.tsx` | Same fix for desktop |
| `src/components/trip/MountedTabs.tsx` | Same fix for utility component |
| `src/components/places/MapCanvas.tsx` | Better fallback when Google Maps fails |
| `src/components/places/BasecampsPanel.tsx` | Ensure graceful degradation |

---

## The Actual Code Change

The simplest fix that addresses both issues:

```tsx
// In the tab rendering loop, change:
if (!hasBeenVisited) return null;

// To:
if (!hasBeenVisited && !isActive) return null;
// This ensures the CURRENT active tab always mounts immediately,
// even on first visit before useEffect has run
```

This one-line change in each of the 3 tab components will fix the race condition.

---

## For Google Maps

The fix requires checking if the Google Maps API key is properly configured. The error you're seeing indicates an API configuration issue on Google's side, not a code issue. However, we can improve the fallback:

1. When Google Maps fails, show OpenStreetMap instead (already partially implemented)
2. Show clearer error messaging about what went wrong
3. Add a "Retry" button that re-attempts API initialization

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Tabs require "click away and back" | Race condition: useEffect updates visitedTabs after render | Mount active tab synchronously: `if (!hasBeenVisited && !isActive) return null` |
| 5-10 second loading times | Lazy loading + data fetching serialized | Already addressed with skeletons; sync mount will help |
| Google Maps "Oops!" error | API key/billing/enablement issue | Improve fallback to OSM; show actionable error |
| White flashes | Suspense fallback + race condition | Sync mount + content-aware skeletons |

---

## Risk Assessment

| Change | Risk | Why Safe |
|--------|------|----------|
| Sync tab mounting | Very Low | Logical fix, no new dependencies |
| MapCanvas fallback improvement | Low | Additive error handling |
| All changes | None | Can be reverted instantly |

---

## Expected Outcome

After these fixes:
1. **First click on any tab loads immediately** - no more "click away and back"
2. **Skeleton shows then content appears** - no white flash
3. **Google Maps shows clear error** if API fails, with retry option
4. **Overall perceived performance** improves dramatically
