
# Trip Tab Performance & Bounce-Back Fix Plan

## Root Cause Analysis

After extensive codebase analysis, I've identified the **primary cause** of the symptoms:

### Why Tabs "Bounce Back to Chat"

When a tab component (Concierge, Media, Payments, Places) **throws an error during render**, the `ErrorBoundary` catches it and displays an error UI. However, the error boundary is placed **inside** `MobileTripTabs` wrapping ALL tab content at once (line 337), not around each individual tab. When a tab throws:

1. User clicks "Concierge"
2. Concierge component starts loading
3. Concierge throws an error (API failure, missing data, etc.)
4. ErrorBoundary catches the error and re-renders
5. **On reset**, `errorBoundaryKey` increments but **`activeTab` stays as the last tab that worked** (often 'chat')
6. User appears to "bounce back" to chat

### Why You See White Flashes

The `Suspense` fallback shows a spinner, but there's a race condition:
- Tab content starts loading (shows spinner)
- Component throws an error before suspense resolves
- Error boundary catches it → brief white/blank state
- Recovery sets state back to working tab

### Why Payments Gets Stuck

The `MobileTripPayments` component calls `paymentService.getTripPaymentMessages(tripId)` which makes a Supabase query. If the query times out or fails silently (no error thrown, just hangs), the spinner never goes away.

---

## The Fixes

### Fix 1: Per-Tab Error Boundaries (Critical)

**Problem**: Single ErrorBoundary around all tabs causes one failing tab to affect navigation.

**Solution**: Wrap each tab's content in its own `FeatureErrorBoundary` so failures are isolated.

**File**: `src/components/mobile/MobileTripTabs.tsx`

**Current** (line 337):
```tsx
<ErrorBoundary key={`${activeTab}-${errorBoundaryKey}`} compact onRetry={handleErrorRetry}>
  {tabs.filter(t => t.enabled !== false).map(tab => { ... })}
</ErrorBoundary>
```

**Change to**: Move ErrorBoundary inside each tab's render:
```tsx
{tabs.filter(t => t.enabled !== false).map(tab => {
  const isActive = activeTab === tab.id;
  const hasBeenVisited = visitedTabs.has(tab.id);
  if (!hasBeenVisited) return null;
  
  return (
    <div key={tab.id} style={{ display: isActive ? 'flex' : 'none', ... }}>
      <Suspense fallback={<TabSkeleton />}>
        <FeatureErrorBoundary featureName={tab.label}>
          {renderTabContent(tab.id)}
        </FeatureErrorBoundary>
      </Suspense>
    </div>
  );
})}
```

This ensures:
- If Concierge fails, you stay on Concierge tab and see "Something went wrong in AI Concierge" with a retry button
- Other tabs remain functional
- No "bounce back to chat"

---

### Fix 2: Add Timeout Safety to Payments Tab (High Priority)

**Problem**: `MobileTripPayments` can hang indefinitely if the Supabase query times out.

**Solution**: Add a 10-second timeout with fallback UI.

**File**: `src/components/mobile/MobileTripPayments.tsx`

**Add**:
```tsx
const [timedOut, setTimedOut] = useState(false);

useEffect(() => {
  const timeout = setTimeout(() => {
    if (isLoading) {
      setTimedOut(true);
      console.warn('[MobileTripPayments] Query timeout - showing fallback');
    }
  }, 10000);
  
  return () => clearTimeout(timeout);
}, [isLoading]);

if (timedOut && isLoading) {
  return (
    <div className="p-4 text-center">
      <p className="text-gray-400 mb-4">Payments are taking longer than expected.</p>
      <button onClick={() => { setTimedOut(false); refetch(); }} className="...">
        Retry
      </button>
    </div>
  );
}
```

---

### Fix 3: Add Timeout to Concierge API Health Check (Medium Priority)

**Problem**: AI Concierge may wait indefinitely for API health check.

**File**: `src/components/AIConciergeChat.tsx`

**Add** timeout to initialization:
```tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    if (!isInitialized) {
      setError('Concierge initialization timed out');
    }
  }, 8000);
  
  return () => clearTimeout(timeout);
}, [isInitialized]);
```

---

### Fix 4: Improve Tab Skeleton Visibility (Low Risk, High UX Impact)

**Problem**: Current skeleton is a small spinner that's easy to miss; contributes to "white flash" perception.

**Solution**: Use the new CalendarSkeleton/ChatSkeleton/PlacesSkeleton we just created.

**File**: `src/components/mobile/MobileTripTabs.tsx`

**Change** `TabSkeleton` to be content-aware:
```tsx
const getSkeletonForTab = (tabId: string) => {
  switch (tabId) {
    case 'calendar':
      return <CalendarSkeleton />;
    case 'chat':
      return <ChatSkeleton />;
    case 'places':
      return <PlacesSkeleton />;
    default:
      return <TabSkeleton />;
  }
};
```

And use in Suspense:
```tsx
<Suspense fallback={getSkeletonForTab(tab.id)}>
```

---

### Fix 5: Same Pattern for Desktop (Consistency)

Apply the same per-tab error boundary pattern to:
- `src/components/TripTabs.tsx` (desktop consumer)
- `src/components/pro/ProTabContent.tsx` (desktop pro)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/mobile/MobileTripTabs.tsx` | Per-tab ErrorBoundary, tab-specific skeletons |
| `src/components/mobile/MobileTripPayments.tsx` | Add 10s timeout with retry UI |
| `src/components/AIConciergeChat.tsx` | Add initialization timeout |
| `src/components/TripTabs.tsx` | Per-tab ErrorBoundary (desktop parity) |
| `src/components/pro/ProTabContent.tsx` | Per-tab ErrorBoundary (pro trips) |

---

## Risk Assessment

| Change | Risk | Why |
|--------|------|-----|
| Per-tab ErrorBoundary | Low | Restructures existing pattern, no logic change |
| Payments timeout | Low | Adds fallback, doesn't remove existing functionality |
| Concierge timeout | Low | Adds user-facing feedback, doesn't break API |
| Tab skeletons | None | Uses components already created |

---

## Expected Outcome

After these fixes:

1. **No more "bounce back to chat"** - errors stay on the tab that failed
2. **No more indefinite spinners** - 10s timeout shows retry UI
3. **Better perceived performance** - content-aware skeletons reduce "white flash" 
4. **Clear error feedback** - users see which feature failed and can retry

---

## Verification Steps

1. Click Concierge → if API fails, should see "Something went wrong in AI Concierge" **on the Concierge tab**
2. Click Payments → if slow, should show retry after 10s, not infinite spinner
3. Click Places → should show PlacesSkeleton (map-like grid) instead of generic spinner
4. Switch between tabs rapidly → no white flashes, smooth transitions
5. Test on mobile viewport → same behavior as desktop
