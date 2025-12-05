# 🔗 Chravel Invite System Documentation

## Overview

The invite system allows trip creators/members to generate shareable links that others can use to join trips, events, or pro trips. It works like Partiful/Luma - no third-party APIs needed!

## Architecture

### Database Tables

1. **`trip_invites`** - Stores invite codes and settings
   - `code` (UUID) - Unique invite code
   - `trip_id` - Trip being invited to
   - `is_active` - Whether invite is still valid
   - `expires_at` - Optional expiration date
   - `max_uses` - Optional usage limit
   - `current_uses` - Usage counter
   - `require_approval` - Whether joins need approval

2. **`trip_join_requests`** - Stores join requests when approval is required
   - `trip_id` - Trip being requested
   - `user_id` - User requesting to join
   - `invite_code` - Code used
   - `status` - pending | approved | rejected

3. **`trip_members`** - Stores trip memberships
   - `trip_id` - Trip
   - `user_id` - Member
   - `role` - Member role

### Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CREATE INVITE LINK                              │
└─────────────────────────────────────────────────────────────────────┘

1. User opens invite modal
2. useInviteLink hook generates UUID
3. Insert into trip_invites table (with RLS check)
4. Build URL: https://chravel.com/join/{code}
5. Display link + share options

┌─────────────────────────────────────────────────────────────────────┐
│                      SOMEONE CLICKS LINK                             │
└─────────────────────────────────────────────────────────────────────┘

1. User visits /join/{code}
2. Edge function: get-invite-preview
   - Fetches trip details
   - Validates invite (active, not expired, under max uses)
   - Returns trip info (NO AUTH REQUIRED)

3. User sees trip preview + "Join Trip" button

┌─────────────────────────────────────────────────────────────────────┐
│                      USER CLICKS "JOIN TRIP"                         │
└─────────────────────────────────────────────────────────────────────┘

1. If not logged in → Redirect to login (store code in sessionStorage)
2. Edge function: join-trip (REQUIRES AUTH)
   - Validates invite again
   - Checks if already member
   - If require_approval:
     → Insert into trip_join_requests
     → Notify admins
   - If no approval needed:
     → Insert into trip_members
     → Increment current_uses
3. Redirect to trip page
```

## Components

### Frontend

- **`useInviteLink.ts`** - Hook for generating/managing invite links
- **`InviteModal.tsx`** - UI for creating and sharing invites
- **`JoinTrip.tsx`** - Page for joining via invite link
- **`ShareTripModal.tsx`** - Alternative share interface

### Backend (Edge Functions)

- **`get-invite-preview`** - Get invite details without auth
- **`join-trip`** - Process joining a trip (requires auth)

## Security (RLS Policies)

### trip_invites

- **SELECT**: Anyone can view active invites (for joining)
- **INSERT**: Trip creators, admins, or members can create invites
- **UPDATE**: Trip creators and admins can update invites
- **DELETE**: Trip creators and admins can delete invites

### trip_join_requests

- **SELECT**: Users can view their own requests; admins can view all for their trips
- **INSERT**: Users can create join requests if invite is valid
- **UPDATE**: Admins can approve/reject requests

### trip_members

- **INSERT**: Handled by edge functions using service role (bypasses RLS)
- **SELECT**: Members can view other members
- **DELETE**: Admins can remove members

## Common Issues & Solutions

### Issue: "Loading invite link..." forever

**Cause**: RLS policy blocking INSERT into trip_invites

**Solution**:
1. Check if user is logged in
2. Verify user is a trip member/creator/admin
3. Check browser console for RLS errors (code 42501)
4. Run the migration: `20251205000000_fix_invite_system_rls_policies.sql`

### Issue: Join requests not creating

**Cause**: Missing INSERT policy on trip_join_requests

**Solution**: Run the fix migration (included in the fix above)

### Issue: Links work but don't add user to trip

**Cause**: Edge function permissions or trip_members policy

**Solution**:
1. Check Supabase edge function logs
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check that edge function has correct JWT

## Testing Checklist

- [ ] Create invite link as trip creator
- [ ] Create invite link as trip member
- [ ] Create invite link as trip admin
- [ ] Copy and share link
- [ ] Open link in incognito (not logged in)
- [ ] Join trip without approval
- [ ] Join trip with approval required
- [ ] Verify expiration works (7 days)
- [ ] Verify max uses works
- [ ] Regenerate link (old one deactivated)
- [ ] Test with consumer trips
- [ ] Test with pro trips
- [ ] Test with events

## Deployment

1. **Apply Database Migration**:
   ```bash
   # Local development
   supabase db reset

   # Production (via Supabase Dashboard)
   # Go to SQL Editor → Paste migration → Run
   ```

2. **Deploy Edge Functions** (if modified):
   ```bash
   supabase functions deploy get-invite-preview
   supabase functions deploy join-trip
   ```

3. **Verify Environment Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for edge functions)

## Monitoring

Check these to ensure invites are working:

```sql
-- View all active invites
SELECT
  ti.code,
  ti.trip_id,
  t.name as trip_name,
  ti.created_at,
  ti.expires_at,
  ti.current_uses,
  ti.max_uses,
  ti.require_approval
FROM trip_invites ti
JOIN trips t ON t.id = ti.trip_id
WHERE ti.is_active = true
ORDER BY ti.created_at DESC;

-- View pending join requests
SELECT
  tjr.*,
  t.name as trip_name,
  p.display_name as requester_name
FROM trip_join_requests tjr
JOIN trips t ON t.id = tjr.trip_id
JOIN profiles p ON p.user_id = tjr.user_id
WHERE tjr.status = 'pending'
ORDER BY tjr.created_at DESC;

-- View recent joins
SELECT
  tm.user_id,
  tm.trip_id,
  t.name as trip_name,
  p.display_name,
  tm.created_at
FROM trip_members tm
JOIN trips t ON t.id = tm.trip_id
JOIN profiles p ON p.user_id = tm.user_id
WHERE tm.created_at > now() - interval '24 hours'
ORDER BY tm.created_at DESC;
```

## API Reference

### useInviteLink Hook

```tsx
const {
  inviteLink,           // Generated URL
  loading,              // Loading state
  copied,               // Copy feedback state
  handleCopyLink,       // Copy link to clipboard
  handleShare,          // Native share (mobile)
  handleEmailInvite,    // Open email client
  handleSMSInvite,      // Open SMS client
  regenerateInviteToken // Generate new link
} = useInviteLink({
  isOpen: true,
  tripName: "Summer Trip",
  requireApproval: false,
  expireIn7Days: true,
  tripId: "123",        // For consumer trips
  proTripId: undefined  // For pro trips/events
});
```

### Edge Functions

**get-invite-preview**
```typescript
POST /functions/v1/get-invite-preview
Body: { code: string }
Returns: {
  success: boolean,
  invite?: { ... },
  trip?: { ... },
  error?: string
}
```

**join-trip**
```typescript
POST /functions/v1/join-trip
Headers: { Authorization: "Bearer <jwt>" }
Body: { inviteCode: string }
Returns: {
  success: boolean,
  trip_id?: string,
  requires_approval?: boolean,
  already_member?: boolean,
  message: string
}
```

## Future Enhancements

- [ ] Analytics dashboard for invite usage
- [ ] Custom invite URLs (e.g., /join/summer-trip)
- [ ] QR code generation
- [ ] Email templates for invites
- [ ] Batch invites (invite multiple emails at once)
- [ ] Role-specific invites (join as specific role)
- [ ] Invite landing page customization
- [ ] Social media preview cards (Open Graph)

---

**Last Updated**: 2025-12-05
**Maintained By**: Chravel Engineering Team
