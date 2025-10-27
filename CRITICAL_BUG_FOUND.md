# 🚨 CRITICAL BUG FOUND - InlineChannelList

## The Problem

I found a **critical React hooks issue** in `InlineChannelList.tsx`:

```tsx
// Line 21-23 - BUGGY CODE:
useEffect(() => {
  loadChannels();
}, [tripId]);  // ❌ Missing loadChannels in dependency array!
```

## Why This Breaks

1. **ESLint React Hooks Rule Violation**: The `loadChannels` function is used in `useEffect` but not listed in the dependencies
2. **Stale Closures**: `loadChannels` captures stale values of `isDemoTrip`, `tripId`, etc.
3. **Race Conditions**: Function might reference old state/props
4. **Channels May Not Load**: Especially problematic on re-renders

## The Fix

### Option 1: Move loadChannels inside useEffect
```tsx
useEffect(() => {
  const loadChannels = async () => {
    setLoading(true);
    
    const isDemoTrip = DEMO_TRIP_IDS.includes(tripId);
    if (isDemoTrip) {
      const { channels } = getDemoChannelsForTrip(tripId);
      setChannels(channels);
    } else {
      const accessibleChannels = await channelService.getAccessibleChannels(tripId);
      setChannels(accessibleChannels);
    }
    
    setLoading(false);
  };
  
  loadChannels();
}, [tripId]);
```

### Option 2: Use useCallback
```tsx
const loadChannels = useCallback(async () => {
  setLoading(true);
  
  if (isDemoTrip) {
    const { channels } = getDemoChannelsForTrip(tripId);
    setChannels(channels);
  } else {
    const accessibleChannels = await channelService.getAccessibleChannels(tripId);
    setChannels(accessibleChannels);
  }
  
  setLoading(false);
}, [tripId, isDemoTrip]);

useEffect(() => {
  loadChannels();
}, [loadChannels]);
```

## Additional Issues Found

### Issue #2: isDemoTrip Computed Outside Effect
```tsx
// Line 19 - PROBLEMATIC:
const isDemoTrip = DEMO_TRIP_IDS.includes(tripId);
```

This is computed on every render, but `tripId` could change. If `tripId` changes, `isDemoTrip` updates, but the useEffect doesn't know about it!

## Impact

This bug means:
- ✅ Component renders
- ❌ Channels might not load correctly
- ❌ Switching between trips might not reload channels
- ❌ Demo trips might show "No channels" even though data exists

## Solution

I need to refactor `InlineChannelList.tsx` to fix the hooks dependencies.
