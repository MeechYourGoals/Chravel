
# Google Maps "Interactive map unavailable. Retry" Fix

## Problem Summary
The "Retry" button on the interactive map warning banner currently triggers `window.location.reload()`, which reloads the entire page. However, because the underlying issue persists (e.g., API key restrictions, network issues, timeout), the map simply fails again in the same way.

## Root Cause
The map initialization logic runs in a `useEffect` on component mount. There's no mechanism to re-trigger this initialization without a full page reload—and a full reload doesn't help if the transient issue (like a timeout or network hiccup) has already resolved.

---

## Simple Fix (3 Changes)

### 1. Create a retry trigger state

Add a simple state variable that, when changed, re-runs the map initialization effect.

```typescript
const [retryAttempt, setRetryAttempt] = useState(0);
```

### 2. Update the Retry button handler

Instead of reloading the page, reset the fallback flags and increment the retry counter:

```typescript
onClick={() => {
  setForceIframeFallback(false);
  setUseFallbackEmbed(false);
  setRetryAttempt(prev => prev + 1);
}}
```

### 3. Add retry trigger to the useEffect dependencies

The map initialization `useEffect` currently has an empty dependency array (`[]`). Add `retryAttempt` so it re-runs when retry is clicked:

```typescript
useEffect(() => {
  // ... existing initMap logic
}, [retryAttempt]); // Add retryAttempt as dependency
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/places/MapCanvas.tsx` | Add `retryAttempt` state, update Retry button handler, add dependency to useEffect |

---

## Why This Works

1. User clicks "Retry" → state flags reset + `retryAttempt` increments
2. The `useEffect` with `[retryAttempt]` dependency detects the change and re-runs
3. `initMap()` attempts to load the Google Maps JS API again
4. If successful → interactive map appears
5. If still failing → fallback flags get set again, embed remains visible

---

## Benefits Over ChatGPT Codex Solution

| Aspect | Codex Solution | This Solution |
|--------|---------------|---------------|
| Lines of code | ~200+ lines | ~10 lines |
| New files | Modified `maps.ts` exports | None |
| Complexity | New refs, callbacks, helpers | Single state variable |
| Risk | Higher (more moving parts) | Lower (minimal change) |
| Same outcome | Yes | Yes |

---

## Technical Summary

**Changes:**
1. Add `const [retryAttempt, setRetryAttempt] = useState(0);` near line 77
2. Change line 804 from `onClick={() => window.location.reload()}` to `onClick={() => { setForceIframeFallback(false); setUseFallbackEmbed(false); setRetryAttempt(prev => prev + 1); }}`
3. Change line 456 from `}, []);` to `}, [retryAttempt]);`
