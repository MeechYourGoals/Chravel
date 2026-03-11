---
name: chravel-no-regressions
description: Prevent the top Chravel regressions — Trip Not Found, auth desync, RLS leaks, chat rendering breaks, and payment state drift. Use when making changes to trip loading, auth, realtime, or payments. Auto-triggers when editing critical path files. Triggers on "regression check", "will this break trips", "is this safe", "Trip Not Found", "auth regression".
---

# Chravel No-Regressions Guard

Prevent the recurring regressions that break Chravel's critical paths.

## Top Regression Classes

### 1. Trip Not Found (CRITICAL)
**What breaks:** Users see "Trip Not Found" for trips that exist.

**Root causes:**
- Auth state not resolved before trip query fires
- useEffect dependency array missing auth state
- Race condition between auth hydration and data fetch
- Trip access check failing because member query ran before auth

**Prevention:**
- Auth gate component wraps all trip routes
- Trip hooks wait for `auth.uid()` to be truthy before querying
- Loading state shown during auth hydration, NOT "Not Found"
- Separate "loading" / "not found" / "not authorized" states

**Files to protect:** Any file touching `useTrip`, `useTripMembers`, trip route components

### 2. Auth Desync
**What breaks:** User appears logged out when they're not, or vice versa.

**Root causes:**
- Supabase auth listener not cleaning up properly
- Multiple auth state sources competing
- Session refresh timing issues
- Redirect after auth not preserving destination

**Prevention:**
- Single source of truth for auth state (`useAuth` hook)
- Auth listener cleanup in effect return
- Redirect URL preserved through auth flow

### 3. RLS Leaks
**What breaks:** Users access data they shouldn't, or get permission errors for data they should access.

**Root causes:**
- New table without RLS policies
- RLS policy checks wrong column
- Edge function bypasses RLS without proper auth check

**Prevention:**
- Every new table gets RLS policies in the same migration
- RLS policies reviewed in every PR touching database

### 4. Chat Rendering
**What breaks:** Messages appear out of order, duplicate, or don't appear.

**Root causes:**
- Realtime subscription reconnection gaps
- Optimistic updates conflicting with realtime inserts
- Scroll position jumping on new messages

### 5. Payment State Drift
**What breaks:** Balance shows wrong amount, payment request status stale.

**Root causes:**
- Cache not invalidated after payment mutation
- Optimistic update not rolled back on failure
- RevenueCat entitlement cache stale

## Pre-Change Checklist

Before modifying any critical path file:
- [ ] Identify which regression class this change touches
- [ ] Verify existing tests cover the critical path
- [ ] Test auth hydration → data fetch → render sequence
- [ ] Verify loading/error/empty states are distinct
- [ ] Check mobile and desktop both render correctly
- [ ] Run `npm run build` — broken code doesn't ship
