# Trip Invite Deep Links & Share Flow

## Summary

This document describes the complete invite deep link and share trip functionality for Chravel. The system supports **My Trips (consumer)**, **Pro Trips**, and **Events** with both direct-join and approval-required workflows.

---

## Previous Setup

The invite system was **95% complete** with the following components already in place:

### Existing Components
- **Database Tables**: `trip_invites`, `trip_join_requests`, `trip_members` with proper schema
- **Edge Functions**: `join-trip`, `get-invite-preview`, `approve-join-request`
- **Database RPC Functions**: `approve_join_request()`, `reject_join_request()`
- **RLS Policies**: Proper row-level security for all invite-related tables
- **UI Components**: `JoinTrip` page, `InviteModal`, `CollaboratorsModal`, `PendingTripsSection`
- **Hooks**: `useInviteLink`, `useJoinRequests`, `useMyPendingTrips`

### Minor Issues Fixed
1. **RPC Typing**: `useJoinRequests` hook was using `as any` for RPC calls - fixed to use proper types
2. **Response Handling**: Added proper response validation for approve/reject RPC calls

---

## Changes Made

### 1. Fixed `useJoinRequests.ts` (src/hooks/useJoinRequests.ts)
- Removed `as any` type casts from RPC calls
- Added proper response validation for `approve_join_request` and `reject_join_request`
- Added proper dependencies to `useCallback` hooks

### 2. Created `tripInviteService.ts` (src/services/tripInviteService.ts)
New centralized service layer providing:
- `getInvitePreview(code)` - Fetch invite preview without auth
- `acceptInvite(code)` - Join trip with auth
- `storeInviteCodeForLogin(code)` - Store code for post-login pickup
- `getStoredInviteCode()` - Retrieve stored code
- `createInviteLink(options)` - Generate new invite links
- `deactivateInviteLink(code)` - Deactivate an invite
- `getActiveInviteForTrip(tripId)` - Get current active invite
- `getTripDetailRoute(tripId, tripType)` - Get correct route for trip type
- `getInviteErrorMessage(errorCode)` - Human-readable error messages

---

## How the Invite Deep Link Flow Works

### Flow Diagram

```
User clicks invite link (/join/{code})
           │
           ▼
┌─────────────────────────────┐
│   JoinTrip.tsx Page Loads   │
│   Calls get-invite-preview  │
└─────────────┬───────────────┘
              │
              ▼
    ┌─────────────────┐
    │  Is link valid? │
    └────────┬────────┘
             │
    ┌────────┴────────┐
    │ YES             │ NO
    ▼                 ▼
Shows trip       Shows error
preview          (expired/invalid/etc)
    │
    ▼
┌──────────────────┐
│ Is user logged   │
│ in?              │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ YES     │ NO
    ▼         ▼
Click      Store code in
"Join"     sessionStorage,
button     show login/signup
    │              │
    │              ▼
    │         User logs in
    │              │
    │              ▼
    │         Index.tsx picks up
    │         stored code, redirects
    │         to /join/{code}
    │              │
    └──────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Call join-trip edge │
    │ function            │
    └──────────┬──────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
Requires Approval     Direct Join
    │                     │
    ▼                     ▼
Creates               Adds to
trip_join_requests    trip_members
record (pending)          │
    │                     │
    ▼                     │
Notifies trip             │
creator                   │
    │                     │
    ▼                     ▼
Shows "Request       Shows "Added!"
sent" message        Redirects to
    │                trip detail
    ▼
Redirects to home
(pending trips visible)
```

### Key Entry Points

| Route | Component | Purpose |
|-------|-----------|---------|
| `/join/:token` | `JoinTrip.tsx` | Main invite join page |
| `/accept-invite/:token` | `AcceptOrganizationInvite.tsx` | Org invites (separate) |

### Post-Login Pickup

The system stores invite codes in `sessionStorage` when a user needs to log in:

1. User clicks invite link while logged out
2. Code stored: `sessionStorage.setItem('chravel_pending_invite_code', code)`
3. User redirected to home page to log in
4. After login, `Index.tsx` picks up the code and redirects to `/join/{code}`
5. User is now authenticated and can complete the join flow

---

## Database Schema

### trip_invites
```sql
CREATE TABLE trip_invites (
  id UUID PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id),
  code TEXT UNIQUE,           -- e.g., "chravel7x9k2m"
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  current_uses INTEGER DEFAULT 0,
  max_uses INTEGER,           -- NULL = unlimited
  expires_at TIMESTAMPTZ,     -- NULL = never expires
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### trip_join_requests
```sql
CREATE TABLE trip_join_requests (
  id UUID PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id),
  user_id UUID REFERENCES auth.users(id),
  invite_code TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  UNIQUE(trip_id, user_id)
);
```

### RLS Policies

| Policy | Table | Rule |
|--------|-------|------|
| Users can view own requests | `trip_join_requests` | `user_id = auth.uid()` |
| Trip admins can view requests | `trip_join_requests` | User is creator or in `trip_admins` |
| Trip admins can update requests | `trip_join_requests` | User is creator or in `trip_admins` |
| Pending members can view trip preview | `trips` | User has pending join request |

---

## Edge Functions

### join-trip
**Location**: `supabase/functions/join-trip/index.ts`

**Input**: `{ inviteCode: string }`

**Logic**:
1. Validates auth token
2. Looks up invite code
3. Validates: active, not expired, not max uses
4. Checks if user already member
5. If `require_approval`:
   - Creates `trip_join_requests` record
   - Sends notification to trip creator
   - Returns `{ success: true, requires_approval: true }`
6. If no approval needed:
   - Inserts into `trip_members`
   - Increments `current_uses`
   - Returns `{ success: true, trip_id, trip_name, trip_type }`

### get-invite-preview
**Location**: `supabase/functions/get-invite-preview/index.ts`

**Input**: `{ code: string }`

**No auth required** - Used for link previews. This is implemented via an edge function (service role) so we do **not** need (or want) public SELECT access on `trip_invites`.

**Returns**: Trip name, destination, dates, cover image, member count

### approve-join-request
**Location**: `supabase/functions/approve-join-request/index.ts`

**Database RPC alternative**: `approve_join_request(_request_id uuid)`

**Logic**:
1. Validates caller is trip creator or admin
2. Updates `trip_join_requests.status` to 'approved'
3. Inserts user into `trip_members`
4. Sends notification to user

---

## UI Components

### InviteModal
**Location**: `src/components/InviteModal.tsx`

Features:
- Link generation with branded codes
- Copy to clipboard
- Settings: approval toggle, 7-day expiry
- Share via email, SMS, native share
- Bulk CSV upload

### JoinTrip Page
**Location**: `src/pages/JoinTrip.tsx`

Features:
- Trip preview (cover image, name, destination, dates)
- Login/signup prompts for unauthenticated users
- Approval required indicator
- Success/error states
- Mobile deep link attempt (`chravel://join-trip/{token}`)

### CollaboratorsModal
**Location**: `src/components/trip/CollaboratorsModal.tsx`

Features:
- **Members tab**: View/remove members
- **Requests tab** (admin only): Approve/reject pending requests
- Badge showing request count

### PendingTripsSection
**Location**: `src/components/home/PendingTripsSection.tsx`

Shows trips where user has pending join requests on the home page.

---

## Demo Mode Interaction

| Feature | Demo Mode | Authenticated Mode |
|---------|-----------|-------------------|
| Invite links | `demo-{tripId}-{timestamp}` | `chravel{8chars}` |
| Join flow | Shows error for demo codes | Full functionality |
| Pending requests | Mock data from store | Real Supabase data |
| Approve/reject | Updates local store | Calls RPC functions |

---

## Testing Checklist

### My Trip (consumer)
- [ ] Generate invite link
- [ ] Share link via copy/email/SMS
- [ ] Click link while logged in → join → redirect to trip
- [ ] Click link while logged out → login → auto-redirect → join
- [ ] Enable approval → click link → request submitted → appears pending
- [ ] Admin approves → user added to members tab

### Pro Trip
- [ ] Same as My Trip
- [ ] Redirects to `/tour/pro/{tripId}`

### Event
- [ ] Same as My Trip
- [ ] Redirects to `/event/{tripId}`

### Edge Cases
- [ ] Expired invite → shows error
- [ ] Inactive invite → shows error
- [ ] Max uses reached → shows error
- [ ] Already member → shows toast, redirects to trip
- [ ] Network error → retry option

---

## File References

| File | Line | Purpose |
|------|------|---------|
| `src/pages/JoinTrip.tsx` | Full file | Main join page |
| `src/hooks/useJoinRequests.ts` | 138, 173 | RPC calls for approve/reject |
| `src/hooks/useInviteLink.ts` | Full file | Invite generation |
| `src/hooks/useMyPendingTrips.ts` | Full file | User's pending requests |
| `src/components/trip/CollaboratorsModal.tsx` | Full file | Admin approval UI |
| `src/services/tripInviteService.ts` | Full file | New service layer |
| `supabase/functions/join-trip/index.ts` | Full file | Join edge function |
| `supabase/functions/get-invite-preview/index.ts` | Full file | Preview edge function |
| `supabase/migrations/20251113165330_*.sql` | 119-181 | DB schema & RLS |

---

## Confirmed Behavior

When a user clicks an invite URL:

1. **They are shown the trip preview** (name, destination, dates, cover image)
2. **If not logged in**, they can log in/sign up, and the invite code is preserved
3. **After login/signup**, they are automatically redirected back to the join page
4. **On clicking "Join"**:
   - **Direct join**: Added to `trip_members` immediately, redirected to trip detail
   - **Approval required**: Added to `trip_join_requests` (pending), notification sent to host
5. **Pending users** appear in the "Awaiting Approval" section on their home page
6. **Trip hosts** see pending requests in the Collaborators modal → Requests tab
7. **On approval**: User is added to `trip_members` and can access the full trip

The flow works identically for **My Trips**, **Pro Trips**, and **Events**, with appropriate redirects based on `trip_type`.
