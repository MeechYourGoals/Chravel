# Trip Invite Flow Test Checklist

## Pre-Requisites
- [ ] User A (Trip Creator) is logged in
- [ ] User B (Invitee) has a separate browser/incognito session
- [ ] Database has no stale test data

---

## 1. Invite Link Generation
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1 | Trip creator opens trip → Collaborators modal | Modal opens with "Invite Members" section | |
| 1.2 | Click "Generate Invite Link" | Unique invite URL is created | |
| 1.3 | Toggle "Require Approval" ON | Setting persists (check DB: `invite_links.require_approval`) | |
| 1.4 | Toggle "Expire in 7 Days" ON | `expires_at` column populated | |
| 1.5 | Copy invite link | Link copied to clipboard | |
| 1.6 | Share via native share (mobile) | System share sheet appears | |

---

## 2. Join Flow - Unauthenticated User

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1 | Open invite link in incognito | Redirected to login with `returnTo` param preserved | |
| 2.2 | Sign up / Log in | Redirected back to `/join/[code]` page | |
| 2.3 | See trip preview | Trip name, destination, dates visible | |
| 2.4 | Click "Request to Join" | - Toast: "Request sent" <br>- `trip_join_requests` row created with `status='pending'` | |
| 2.5 | Try joining again | Error: "You already have a pending request" | |
| 2.6 | Navigate to home | Pending trip card visible with "Awaiting Approval" badge | |

---

## 3. Join Flow - Authenticated User

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1 | User B (logged in) opens invite link | `/join/[code]` page loads with trip preview | |
| 3.2 | Click "Request to Join" | Request submitted, pending card appears on home | |
| 3.3 | Real-time update test: Admin approves | Pending card → Active trip card (no refresh needed) | |

---

## 4. Admin Approval Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 4.1 | Admin opens trip → Collaborators modal | "Pending Requests" section shows count badge | |
| 4.2 | Click "Show all" | Pending requests list visible | |
| 4.3 | See requester info | Name, email, avatar, request time displayed | |
| 4.4 | Click "Approve" | - Request removed from pending <br>- User added to `trip_members` with `status='active'` <br>- Notification sent to user | |
| 4.5 | Click "Reject" (on another request) | - Request removed <br>- `trip_join_requests.status='rejected'` <br>- User sees "Request denied" on home | |

---

## 5. Notifications

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 5.1 | Join request submitted | Admin gets notification: "New join request from [name]" | |
| 5.2 | Request approved | User gets notification: "You've been added to [trip]" | |
| 5.3 | Request rejected | User gets notification: "Your request was declined" | |

---

## 6. Edge Cases

| Scenario | Expected Behavior | Pass/Fail |
|----------|-------------------|-----------|
| Expired invite link | Error: "This invite link has expired" | |
| Invite link at max uses | Error: "This invite link has reached its limit" | |
| Inactive/disabled link | Error: "This invite link is no longer active" | |
| Already a trip member | Redirect to trip detail (no duplicate join) | |
| Previously rejected, new invite | Can request again (fresh request) | |
| Trip creator joins own trip | Auto-added as admin (no approval needed) | |

---

## 7. Database Verification Queries

```sql
-- Check pending requests
SELECT * FROM trip_join_requests 
WHERE trip_id = '[TRIP_ID]' AND status = 'pending';

-- Check invite link settings
SELECT code, require_approval, expires_at, current_uses, max_uses, is_active 
FROM invite_links WHERE trip_id = '[TRIP_ID]';

-- Check notifications
SELECT * FROM notifications 
WHERE trip_id = '[TRIP_ID]' 
ORDER BY created_at DESC LIMIT 10;

-- Check trip members
SELECT tm.*, p.display_name, p.email 
FROM trip_members tm
LEFT JOIN profiles p ON tm.user_id = p.user_id
WHERE tm.trip_id = '[TRIP_ID]';
```

---

## Sign-Off

| Tester | Date | All Tests Pass | Notes |
|--------|------|----------------|-------|
| | | ☐ Yes ☐ No | |
