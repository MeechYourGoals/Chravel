

# Permanently Remove Development Watermark

## Problem

The "vdev · development" badge appears on every page. Asking users to append URL parameters is impractical.

## Solution

Remove the BuildBadge component entirely from the application.

---

## Changes

| File | Action |
|------|--------|
| `src/App.tsx` | Remove the `<BuildBadge />` component and its import |
| `src/components/BuildBadge.tsx` | Delete the file entirely |

---

## Implementation Details

### 1. Update `src/App.tsx`

**Remove import (line 25):**
```tsx
// DELETE THIS LINE
import BuildBadge from './components/BuildBadge';
```

**Remove usage (line 522):**
```tsx
// DELETE THIS LINE
<BuildBadge />
```

### 2. Delete `src/components/BuildBadge.tsx`

The file will be deleted as it's no longer needed.

---

## Result

The watermark will be permanently gone from all pages, in all environments. No URL parameters needed.

---

## Note on Build Errors

The build errors shown are unrelated to BuildBadge - they're TypeScript errors in the web push notification system because the database types are missing tables (`web_push_subscriptions`) and columns (`trip_updates`, `calendar_reminders`, etc.). These will need to be addressed separately by either:
1. Adding those tables/columns to the database
2. Or removing/stubbing out the push notification features for MVP

