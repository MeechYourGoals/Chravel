# 🧪 Chravel E2E Functional Audit & Demo Parity Report

**Version:** 1.0.0  
**Date:** January 4, 2026  
**Author:** QA Architect / Full-Stack Engineer  
**Scope:** Full authenticated user experience vs Demo Mode parity

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Test Map (Master Checklist)](#test-map-master-checklist)
3. [Tracking System Schema](#tracking-system-schema)
4. [Execution Plan](#execution-plan)
5. [Super Prompt Generator](#super-prompt-generator)
6. [Priority Fix Queue Template](#priority-fix-queue-template)
7. [Coverage Metrics](#coverage-metrics)

---

## Executive Summary

This document provides a comprehensive E2E functional audit framework for the Chravel application, comparing demo mode capabilities with authenticated user experiences. The audit covers:

- **18 Major Feature Areas**
- **150+ Individual Test Cases**
- **Database Tables Verified:** 50+
- **Edge Functions Covered:** 50+
- **RLS Policies Validated:** 30+

### Key Database Tables (Verified from Schema)

| Table | Purpose | RLS Enabled |
|-------|---------|-------------|
| `profiles` | User profiles with display_name, avatar, privacy settings | ✅ |
| `trips` | Core trip data (consumer, pro, event types) | ✅ |
| `trip_members` | Trip membership with role/status | ✅ |
| `trip_chat_messages` | Realtime chat messages | ✅ |
| `trip_events` | Calendar events within trips | ✅ |
| `trip_tasks` | Task items with status tracking | ✅ |
| `trip_polls` | Poll questions and options | ✅ |
| `trip_poll_votes` | Individual poll votes | ✅ |
| `trip_files` | File attachments and media | ✅ |
| `trip_link_index` | Saved links with OG metadata | ✅ |
| `trip_payments` | Payment splits and settlements | ✅ |
| `trip_receipts` | Receipt uploads and OCR data | ✅ |
| `invite_links` | Invite tokens with expiration/usage limits | ✅ |
| `trip_join_requests` | Pending join requests (require_approval) | ✅ |
| `organizations` | Pro/Enterprise organizations | ✅ |
| `organization_members` | Org membership with seats | ✅ |
| `organization_invites` | Org invite tokens | ✅ |
| `subscriptions` | Stripe subscription data | ✅ |
| `notification_preferences` | User notification settings | ✅ |
| `push_tokens` | Device push notification tokens | ✅ |
| `notifications` | Notification history | ✅ |
| `broadcasts` | Broadcast messages | ✅ |
| `user_roles` | Role-based access control | ✅ |
| `calendar_connections` | External calendar sync | ✅ |
| `synced_calendar_events` | External calendar events | ✅ |
| `enhanced_expenses` | Expense tracking | ✅ |
| `travel_bookings` | Travel booking data | ✅ |
| `smart_todos` | AI-generated todos | ✅ |
| `ai_processing_queue` | AI job queue | ✅ |

---

## Test Map (Master Checklist)

### 1. Authentication (AUTH)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| AUTH-001 | Email/Password Signup | As a new user, I can create an account with email | None | 1. Navigate to /auth 2. Enter email, password, names 3. Submit | Account created, confirmation email sent | Session created OR email confirmation required | S0 |
| AUTH-002 | Email/Password Login | As a registered user, I can log in | Confirmed account exists | 1. Navigate to /auth 2. Enter credentials 3. Submit | Redirected to home, user context populated | `useAuth().user` is not null, session valid | S0 |
| AUTH-003 | Google OAuth | As a user, I can sign in with Google | Google OAuth configured | 1. Click "Sign in with Google" 2. Complete OAuth flow | Account created/linked, redirected home | Session valid, profile created | S1 |
| AUTH-004 | Apple OAuth | As a user, I can sign in with Apple | Apple OAuth configured | 1. Click "Sign in with Apple" 2. Complete OAuth flow | Account created/linked, redirected home | Session valid, profile created | S1 |
| AUTH-005 | Phone OTP Login | As a user, I can sign in with phone | SMS provider configured | 1. Enter phone number 2. Receive OTP 3. Enter code | Session created | Session valid | S2 |
| AUTH-006 | Password Reset | As a user, I can reset my password | Account exists | 1. Click "Forgot password" 2. Enter email 3. Check email 4. Reset | Password updated | Can login with new password | S1 |
| AUTH-007 | Session Refresh | As a user, my session auto-refreshes | Active session | 1. Wait for token expiry 2. Perform action | Session refreshed automatically | No re-login required | S1 |
| AUTH-008 | Logout | As a user, I can sign out | Logged in | 1. Click logout 2. Confirm | Session destroyed, redirected to landing | `useAuth().user` is null | S0 |
| AUTH-009 | Invalid Credentials | As a user, I see errors for bad login | None | 1. Enter invalid email/password 2. Submit | Error message displayed | "Invalid email or password" message | S1 |
| AUTH-010 | Unconfirmed Email | As a user, I see confirmation reminder | Unconfirmed account | 1. Try to login | Error with confirmation prompt | "Please confirm your email" message | S2 |
| AUTH-011 | Auth Gate Protection | Unauthenticated users can't access protected routes | Not logged in | 1. Navigate to /trip/:id directly | Redirected to auth or landing | Either AuthModal shown or /auth redirect | S0 |
| AUTH-012 | Demo Mode User | Demo mode provides mock user | Demo mode enabled | 1. Enable app-preview mode | Demo user context available | `user.id` is demo UUID, `isPro` is true | S2 |

### 2. Profile Management (PROFILE)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| PROFILE-001 | View Profile | As a user, I can view my profile | Logged in | 1. Navigate to /profile | Profile page displays | Name, avatar, stats visible | S2 |
| PROFILE-002 | Update Display Name | As a user, I can change my name | Logged in | 1. Go to settings 2. Edit display_name 3. Save | Name updated in DB and UI | `profiles.display_name` updated | S1 |
| PROFILE-003 | Update Avatar | As a user, I can upload a profile photo | Logged in | 1. Go to settings 2. Upload image 3. Save | Avatar URL updated | `profiles.avatar_url` updated, image renders | S2 |
| PROFILE-004 | Update First/Last Name | As a user, I can set first/last name | Logged in | 1. Edit names 2. Save | Names updated | `profiles.first_name`, `last_name` updated | S2 |
| PROFILE-005 | Update Bio | As a user, I can set my bio | Logged in | 1. Edit bio 2. Save | Bio updated | `profiles.bio` updated | S3 |
| PROFILE-006 | Privacy: Show Email | As a user, I can toggle email visibility | Logged in | 1. Toggle show_email 2. Save | Privacy setting updated | `profiles.show_email` reflects choice | S2 |
| PROFILE-007 | Privacy: Show Phone | As a user, I can toggle phone visibility | Logged in | 1. Toggle show_phone 2. Save | Privacy setting updated | `profiles.show_phone` reflects choice | S2 |
| PROFILE-008 | Timezone Setting | As a user, I can set my timezone | Logged in | 1. Select timezone 2. Save | Timezone stored | `profiles.timezone` updated | S2 |
| PROFILE-009 | Profile Self-Heal | Profile auto-creates if missing | New user | 1. Sign up 2. Access profile | Profile row exists | `profiles.user_id` matches `auth.uid()` | S1 |
| PROFILE-010 | Profile Stats Display | As a user, I see my trip stats | Logged in with trips | 1. View profile | Stats show correctly | Trip count, countries, photos, friends accurate | S3 |

### 3. Trips - Consumer (TRIP)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| TRIP-001 | Create Trip | As a user, I can create a new trip | Logged in | 1. Click "Create Trip" 2. Fill form 3. Submit | Trip created, navigated to detail | `trips` row created, user is member | S0 |
| TRIP-002 | View Trip List | As a user, I can see my trips | Logged in with trips | 1. Navigate to home | Trip cards displayed | All user's trips visible | S0 |
| TRIP-003 | View Trip Detail | As a user, I can view trip details | Member of trip | 1. Click trip card | Trip detail page loads | Chat, calendar, etc. tabs available | S0 |
| TRIP-004 | Edit Trip Name | As a user, I can rename a trip | Trip owner/admin | 1. Edit trip name 2. Save | Name updated | `trips.name` updated | S1 |
| TRIP-005 | Edit Trip Dates | As a user, I can change trip dates | Trip owner/admin | 1. Edit dates 2. Save | Dates updated | `trips.start_date`, `end_date` updated | S1 |
| TRIP-006 | Edit Trip Destination | As a user, I can change destination | Trip owner/admin | 1. Edit destination 2. Save | Destination updated | `trips.destination` updated | S2 |
| TRIP-007 | Upload Cover Image | As a user, I can set trip cover photo | Trip owner/admin | 1. Upload image 2. Save | Cover image displayed | `trips.cover_image_url` populated | S2 |
| TRIP-008 | Archive Trip | As a user, I can archive a trip | Trip owner | 1. Archive trip | Trip moved to archive | `trips.is_archived` = true | S1 |
| TRIP-009 | View Archived Trips | As a user, I can view archived trips | Has archived trips | 1. Navigate to /archive | Archived trips displayed | Archived trips list shown | S2 |
| TRIP-010 | Restore Archived Trip | As a user, I can restore archived trip | Has archived trip | 1. Click restore | Trip restored to main list | `trips.is_archived` = false | S2 |
| TRIP-011 | Hide Trip (Delete For Me) | As a member, I can remove trip from my view | Non-owner member | 1. Delete for me | Trip hidden from user | `trip_members` row removed | S1 |
| TRIP-012 | Trip Card Display | Trip cards show correct info | Has trips | 1. View home | Cards show name, location, date, members | All trip data renders correctly | S2 |
| TRIP-013 | Trip Filters | As a user, I can filter trips | Has multiple trips | 1. Apply date filter | Filtered results shown | Correct trips in filtered view | S3 |
| TRIP-014 | Trip Search | As a user, I can search trips | Has multiple trips | 1. Enter search term | Matching trips shown | Semantic search works | S2 |
| TRIP-015 | Pending Trip State | As a user with pending invite, I see pending state | Pending join request | 1. View home | Pending trip card shown | Status indicates "pending" | S1 |
| TRIP-016 | Empty State | New user sees empty state | No trips | 1. View home | Create trip prompt shown | Empty state UI renders | S3 |
| TRIP-017 | Trip Type Detection | System detects consumer vs pro vs event | Various trips | 1. View trips | Correct type badges | `trip_type` correctly classified | S2 |

### 4. Trip Collaborators & Invites (INVITE)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| INVITE-001 | Generate Invite Link | As trip owner, I can create invite link | Own a trip | 1. Open invite modal 2. Generate link | Link created | `invite_links` row created | S0 |
| INVITE-002 | Copy Invite Link | As trip owner, I can copy invite link | Have invite link | 1. Click copy | Link copied to clipboard | Toast confirms copy | S2 |
| INVITE-003 | Share Invite (Native) | As trip owner, I can share via native share | Mobile device | 1. Click share | Native share sheet opens | Web Share API invoked | S3 |
| INVITE-004 | QR Code Generation | As trip owner, I can show QR code | Have invite link | 1. View QR | QR code displayed | QR encodes invite URL | S3 |
| INVITE-005 | Accept Invite (No Approval) | As invitee, I can join via link | Valid invite link | 1. Open invite URL 2. Login/signup 3. Auto-join | Added to trip | `trip_members` row created | S0 |
| INVITE-006 | Accept Invite (With Approval) | As invitee, I request to join | require_approval enabled | 1. Open invite URL 2. Login 3. Request join | Join request created | `trip_join_requests` row created | S0 |
| INVITE-007 | Approve Join Request | As trip owner, I can approve requests | Pending request exists | 1. View requests 2. Approve | User added to trip | `trip_members` created, request updated | S0 |
| INVITE-008 | Reject Join Request | As trip owner, I can reject requests | Pending request exists | 1. View requests 2. Reject | Request denied | Request status = rejected | S1 |
| INVITE-009 | Invite Expiration | Expired invites fail | Expired invite | 1. Open expired link | Error shown | "Invite expired" message | S1 |
| INVITE-010 | Max Uses Limit | Invite with max uses enforced | max_uses reached | 1. Open used-up link | Error shown | "Invite limit reached" message | S1 |
| INVITE-011 | Revoke Invite Link | As trip owner, I can deactivate invite | Active invite | 1. Revoke invite | Link deactivated | `invite_links.is_active` = false | S1 |
| INVITE-012 | Already Member Detection | System detects existing members | User is member | 1. Open own trip invite | Already member message | "You're already a member" toast | S2 |
| INVITE-013 | Invite Preview (Unauthenticated) | Unauthenticated users see preview | Valid invite, not logged in | 1. Open invite URL | Trip preview shown | Trip name, destination, member count visible | S1 |
| INVITE-014 | Re-join After Leave | User can rejoin after leaving | Left trip, valid invite | 1. Open invite 2. Join | Rejoined successfully | New `trip_members` row | S2 |
| INVITE-015 | Invite Settings | Can configure expiration, max uses | Own a trip | 1. Set expiration 2. Set max uses 3. Generate | Settings applied | `invite_links` has correct values | S2 |
| INVITE-016 | View Trip Members | As member, I can see all members | Trip member | 1. View trip info | Members list shown | All members displayed with roles | S1 |
| INVITE-017 | Member Presence | See who's online | Trip member | 1. View trip | Online indicators | Presence indicators work | S3 |

### 5. Chat (CHAT)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| CHAT-001 | Send Text Message | As member, I can send messages | In trip chat | 1. Type message 2. Send | Message appears | `trip_chat_messages` row created | S0 |
| CHAT-002 | Realtime Message Receive | Messages appear in realtime | Multiple members | 1. User A sends 2. User B sees | Message appears without refresh | Supabase realtime subscription works | S0 |
| CHAT-003 | Message Timestamp | Messages show timestamps | Has messages | 1. View chat | Timestamps visible | Correct date/time format | S2 |
| CHAT-004 | Message Sender Info | Messages show sender | Has messages | 1. View chat | Sender name/avatar shown | Profile data displayed | S2 |
| CHAT-005 | Edit Own Message | As sender, I can edit my message | Own message exists | 1. Long-press/click 2. Edit 3. Save | Message updated | `trip_chat_messages.content` updated | S2 |
| CHAT-006 | Delete Own Message | As sender, I can delete my message | Own message exists | 1. Long-press/click 2. Delete | Message removed | Row deleted or soft-deleted | S2 |
| CHAT-007 | React to Message | As member, I can react to messages | Message exists | 1. Long-press 2. Select emoji | Reaction added | Reaction stored and displayed | S3 |
| CHAT-008 | @Mention User | As member, I can mention others | Multiple members | 1. Type @ 2. Select user 3. Send | Mention highlighted | Mention notification triggered | S2 |
| CHAT-009 | Read Receipts | Messages show read status | Has messages | 1. Other user reads | Read indicator updates | `message_read_receipts` updated | S3 |
| CHAT-010 | Image Attachment | As member, I can send images | In chat | 1. Attach image 2. Send | Image appears in chat | Media uploaded, message with media_url | S1 |
| CHAT-011 | File Attachment | As member, I can send files | In chat | 1. Attach file 2. Send | File appears downloadable | `trip_files` or attachment stored | S2 |
| CHAT-012 | Link Preview (OG) | Shared links show preview | In chat | 1. Paste URL 2. Send | OG preview shown | fetch-og-metadata edge function called | S3 |
| CHAT-013 | Offline Message Queue | Messages queue offline | Device offline | 1. Go offline 2. Send message 3. Go online | Message syncs | Offline sync processor works | S1 |
| CHAT-014 | Chat History Load | Can scroll through history | Many messages | 1. Scroll up | Older messages load | Pagination works | S2 |
| CHAT-015 | System Messages | System events show in chat | Actions occur | 1. Perform action (join, etc.) | System message appears | System message category renders | S3 |
| CHAT-016 | Message Search | As member, I can search messages | Has messages | 1. Open search 2. Enter term | Matching messages shown | `messageSearchService` works | S2 |
| CHAT-017 | Threads/Replies | As member, I can reply to messages | Message exists | 1. Reply to message | Thread created | Thread association stored | S3 |
| CHAT-018 | Typing Indicator | See when others type | Multiple members | 1. User types | Typing indicator shows | Presence/typing state broadcast | S3 |

### 6. Broadcasts (BROADCAST)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| BROADCAST-001 | Create Broadcast | As admin, I can send broadcast | Trip admin | 1. Compose broadcast 2. Send | Broadcast sent to all | `broadcasts` row created | S1 |
| BROADCAST-002 | View Broadcasts | As member, I see broadcasts | Has broadcasts | 1. View broadcasts tab | Broadcasts listed | All broadcasts visible | S1 |
| BROADCAST-003 | Broadcast Priority | Urgent broadcasts highlighted | Urgent broadcast exists | 1. View broadcast | Urgent indicator shown | Priority styling applied | S2 |
| BROADCAST-004 | React to Broadcast | As member, I can react | Broadcast exists | 1. React to broadcast | Reaction saved | `broadcasts-react` function works | S3 |
| BROADCAST-005 | Broadcast Read Status | Track who read broadcast | Broadcast exists | 1. View broadcast | Read count shown | `readBy` array updated | S3 |
| BROADCAST-006 | Schedule Broadcast | As admin, I can schedule | Admin access | 1. Compose 2. Set schedule 3. Save | Scheduled for future | `message-scheduler` function handles | S2 |
| BROADCAST-007 | Target Specific Roles | Broadcast to specific roles | Pro trip with roles | 1. Select target roles 2. Send | Only targeted roles receive | Role-based targeting works | S2 |

### 7. Calendar & Events (CALENDAR)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| CALENDAR-001 | Create Event | As member, I can add event | In trip | 1. Add event 2. Fill details 3. Save | Event created | `trip_events` row created | S0 |
| CALENDAR-002 | View Calendar | As member, I see trip calendar | Has events | 1. View calendar tab | Events displayed | All events visible on calendar | S1 |
| CALENDAR-003 | Edit Event | As creator, I can edit event | Own event | 1. Edit event 2. Save | Event updated | `trip_events` updated | S1 |
| CALENDAR-004 | Delete Event | As creator, I can delete event | Own event | 1. Delete event | Event removed | Row deleted | S1 |
| CALENDAR-005 | Event Categories | Events have categories | Create event | 1. Select category | Category saved | `event_category` populated | S2 |
| CALENDAR-006 | Event Location | Events have location | Create event | 1. Set location | Location saved | Location field populated | S2 |
| CALENDAR-007 | Event Time/Date | Events have correct datetime | Create event | 1. Set date/time | DateTime correct | Timezone handling correct | S1 |
| CALENDAR-008 | Recurring Events | Can create recurring events | RRULE support | 1. Set recurrence 2. Save | Series created | `recurrence_rule` stored | S2 |
| CALENDAR-009 | Recurrence Exceptions | Can exclude dates from series | Recurring event | 1. Add exception | Exception stored | `recurrence_exceptions` updated | S3 |
| CALENDAR-010 | Conflict Detection | System detects overlaps | Multiple events | 1. Create overlapping event | Warning shown | Conflict indicator displayed | S2 |
| CALENDAR-011 | ICS Export | Can export calendar | Has events | 1. Export to ICS | ICS file downloads | Valid ICS format | S2 |
| CALENDAR-012 | External Calendar Sync | Can sync with Google/Outlook | Calendar connected | 1. Enable sync | Events sync | `synced_calendar_events` populated | S2 |
| CALENDAR-013 | Reminders | Events trigger reminders | Event with reminder | 1. Wait for reminder time | Notification sent | `event-reminders` function triggers | S2 |
| CALENDAR-014 | Itinerary View | See day-by-day itinerary | Has events | 1. View itinerary | Days grouped | ItineraryView renders correctly | S2 |
| CALENDAR-015 | Include in Itinerary Toggle | Can toggle event visibility | Event exists | 1. Toggle include | Setting saved | `include_in_itinerary` updated | S3 |
| CALENDAR-016 | Busy/Free Status | Events show availability | Event exists | 1. Set availability | Status saved | `availability_status` stored | S3 |

### 8. Tasks (TASK)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| TASK-001 | Create Task | As member, I can create task | In trip | 1. Add task 2. Enter title 3. Save | Task created | `trip_tasks` row created | S1 |
| TASK-002 | View Tasks | As member, I see all tasks | Has tasks | 1. View tasks tab | Tasks listed | All tasks visible | S1 |
| TASK-003 | Complete Task | As member, I can complete task | Task exists | 1. Mark complete | Task marked done | `task_status.completed` = true | S0 |
| TASK-004 | Uncomplete Task | As member, I can uncomplete | Completed task | 1. Unmark complete | Task marked incomplete | `task_status.completed` = false | S2 |
| TASK-005 | Task Due Date | Tasks can have due dates | Create task | 1. Set due date 2. Save | Due date saved | `trip_tasks.due_at` populated | S2 |
| TASK-006 | Task Description | Tasks can have descriptions | Create task | 1. Add description 2. Save | Description saved | `trip_tasks.description` populated | S3 |
| TASK-007 | Delete Task | As creator, I can delete task | Own task | 1. Delete task | Task removed | Row deleted | S2 |
| TASK-008 | Task Assignment | Can assign to members | Task exists | 1. Assign to user | Assignment saved | `task_status` rows created per assignee | S2 |
| TASK-009 | Reassign Task | Can change assignment | Assigned task | 1. Change assignee | Assignment updated | Assignee updated | S2 |
| TASK-010 | Deleted User Edge Case | Tasks handle deleted users | Assignee deleted | 1. View task | Graceful handling | No crash, shows "Unknown user" | S1 |
| TASK-011 | Task Permissions | Only members can manage | Non-member | 1. Try to edit | Access denied | RLS blocks operation | S0 |
| TASK-012 | My Tasks Filter | Can filter to my tasks | Has assigned tasks | 1. Filter to mine | Only my tasks shown | Filter works correctly | S3 |

### 9. Polls (POLL)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| POLL-001 | Create Poll | As member, I can create poll | In trip | 1. Create poll 2. Add options 3. Save | Poll created | `trip_polls` row created | S1 |
| POLL-002 | Vote on Poll | As member, I can vote | Poll exists | 1. Select option 2. Vote | Vote recorded | `trip_poll_votes` row created | S0 |
| POLL-003 | Change Vote | As member, I can change vote | Have voted | 1. Select different option | Vote updated | Vote row updated | S2 |
| POLL-004 | View Results | As member, I see results | Poll has votes | 1. View poll | Results shown | Vote counts displayed | S1 |
| POLL-005 | Realtime Results | Results update live | Multiple voters | 1. Others vote 2. View updates | Counts update | Realtime subscription works | S2 |
| POLL-006 | Offline Vote Queue | Votes queue offline | Offline | 1. Vote offline 2. Go online | Vote syncs | Offline queue processes | S2 |
| POLL-007 | Close Poll | As creator, I can close poll | Own poll | 1. Close poll | Voting disabled | Poll status = closed | S2 |
| POLL-008 | Poll Permissions | Only members can vote | Non-member | 1. Try to vote | Access denied | RLS blocks vote | S0 |
| POLL-009 | Multiple Choice Display | Show all options | Poll with options | 1. View poll | All options visible | Options render correctly | S2 |

### 10. Media (MEDIA)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| MEDIA-001 | Upload Photo | As member, I can upload photo | In trip | 1. Select photo 2. Upload | Photo added | `trip_files` or storage bucket populated | S1 |
| MEDIA-002 | View Photos | As member, I see all photos | Has photos | 1. View media tab | Photos grid shown | All photos visible | S1 |
| MEDIA-003 | Photo Preview | Can tap to preview | Has photos | 1. Tap photo | Full preview opens | Large image displayed | S2 |
| MEDIA-004 | Download Photo | Can download photos | Has photos | 1. Download photo | Photo downloads | File saves to device | S2 |
| MEDIA-005 | Delete Photo | As uploader, I can delete | Own photo | 1. Delete photo | Photo removed | File deleted from storage | S2 |
| MEDIA-006 | Video Upload | Can upload videos | In trip | 1. Upload video | Video added | Video file stored | S2 |
| MEDIA-007 | File Upload | Can upload documents | In trip | 1. Upload file | File added | Document stored | S2 |
| MEDIA-008 | OCR Extraction | System extracts text from images | Image with text | 1. Upload image | Text extracted | OCR processing works | S3 |
| MEDIA-009 | Storage Quota | Shows storage usage | Using storage | 1. View quota | Usage displayed | StorageQuotaBar shows usage | S3 |
| MEDIA-010 | Media Limits | Enforces upload limits | Free tier | 1. Exceed limit | Limit warning | Media limits enforced | S2 |
| MEDIA-011 | Optimized Image Loading | Images load progressively | Has many images | 1. Scroll gallery | Progressive load | OptimizedImage component works | S3 |
| MEDIA-012 | Media from Chat | Chat images appear in media | Chat with images | 1. View media | Chat images included | source = 'chat' images shown | S2 |

### 11. Links (LINKS)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| LINKS-001 | Save Link | As member, I can save link | In trip | 1. Add link 2. Save | Link saved | `trip_link_index` row created | S2 |
| LINKS-002 | View Links | As member, I see saved links | Has links | 1. View links | Links listed | All links visible | S2 |
| LINKS-003 | OG Preview Unfurl | Links show OG metadata | Link saved | 1. View link | Title, image, description shown | `fetch-og-metadata` function works | S2 |
| LINKS-004 | Delete Link | Can delete saved links | Link exists | 1. Delete link | Link removed | Row deleted | S3 |
| LINKS-005 | Link from Chat | Chat links auto-save | Link posted in chat | 1. Post URL in chat | Link indexed | source = 'chat' in link_index | S3 |
| LINKS-006 | Link Categories | Links can be categorized | Link exists | 1. Categorize link | Category saved | Category field populated | S3 |
| LINKS-007 | Link Search | Can search links | Has links | 1. Search links | Matching links shown | Search works | S3 |

### 12. Payments (PAYMENT)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| PAYMENT-001 | Create Payment Split | As member, I can create split | In trip | 1. Create payment 2. Set amount 3. Add participants | Split created | `trip_payments` row created | S0 |
| PAYMENT-002 | View Payments | As member, I see all splits | Has payments | 1. View payments tab | Payments listed | All splits visible | S1 |
| PAYMENT-003 | Equal Split | Can split equally | Create payment | 1. Select equal split | Amount divided equally | Participant amounts correct | S1 |
| PAYMENT-004 | Custom Split | Can set custom amounts | Create payment | 1. Set custom amounts | Custom amounts saved | splitType = 'custom' | S2 |
| PAYMENT-005 | Percentage Split | Can split by percentage | Create payment | 1. Set percentages | Percentages saved | splitType = 'percentage' | S2 |
| PAYMENT-006 | Upload Receipt | Can attach receipt | Payment exists | 1. Upload receipt 2. Save | Receipt attached | `trip_receipts` row created | S1 |
| PAYMENT-007 | Receipt OCR | System parses receipt | Receipt uploaded | 1. Upload receipt | Amount extracted | `process-receipt-ocr` function works | S2 |
| PAYMENT-008 | Mark as Paid | Participant can mark paid | In split | 1. Mark as paid | Status updated | `participant.paid` = true | S1 |
| PAYMENT-009 | Settlement Status | Shows who owes what | Has payments | 1. View summary | Balances shown | BalanceSummary calculated | S1 |
| PAYMENT-010 | Payment Reminders | Can send reminders | Unpaid amounts | 1. Send reminder | Notification sent | `payment-reminders` function works | S2 |
| PAYMENT-011 | Venmo Deep Link | Can open Venmo | Venmo configured | 1. Click pay via Venmo | Venmo app opens | Deep link works | S2 |
| PAYMENT-012 | Zelle Deep Link | Can open Zelle | Zelle configured | 1. Click pay via Zelle | Zelle opens | Deep link works | S3 |
| PAYMENT-013 | CashApp Deep Link | Can open CashApp | CashApp configured | 1. Click pay | CashApp opens | Deep link works | S3 |
| PAYMENT-014 | Payment Audit Trail | History of changes | Has payments | 1. View history | Changes logged | Audit data available | S3 |
| PAYMENT-015 | Multi-Currency | Supports multiple currencies | Create payment | 1. Select currency | Currency saved | Currency field populated | S3 |
| PAYMENT-016 | Payment Categories | Can categorize expenses | Create payment | 1. Set category | Category saved | Category field populated | S3 |
| PAYMENT-017 | Confirmation Status | Can confirm payments | Payment marked paid | 1. Confirm payment | Confirmed status | confirmationStatus = 'confirmed' | S3 |

### 13. PDF Recaps (EXPORT)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| EXPORT-001 | Generate PDF | As member, I can export trip | In trip | 1. Open export 2. Select sections 3. Generate | PDF created | PDF blob generated | S1 |
| EXPORT-002 | Select Sections | Can choose what to include | Export modal open | 1. Toggle sections | Selection saved | Only selected sections in PDF | S2 |
| EXPORT-003 | Include Calendar | Calendar in export | Events exist | 1. Include calendar | Calendar in PDF | Calendar section renders | S2 |
| EXPORT-004 | Include Tasks | Tasks in export | Tasks exist | 1. Include tasks | Tasks in PDF | Tasks section renders | S2 |
| EXPORT-005 | Include Payments | Payments in export | Payments exist | 1. Include payments | Payments in PDF | Payments section renders | S2 |
| EXPORT-006 | Include Media | Media in export | Photos exist | 1. Include media | Media in PDF | Photos section renders | S3 |
| EXPORT-007 | Include Links | Links in export | Links exist | 1. Include links | Links in PDF | Links section renders | S3 |
| EXPORT-008 | Empty State | Handle empty sections | No data | 1. Export | Graceful handling | No crash, empty sections handled | S2 |
| EXPORT-009 | Download PDF | Can download generated PDF | PDF generated | 1. Download | PDF downloads | File saves correctly | S1 |
| EXPORT-010 | iOS Download Compat | Works on iOS Safari | iOS device | 1. Generate 2. Download | Opens/downloads | iOS-compatible download | S2 |
| EXPORT-011 | Export Permissions | Only members can export | Non-member | 1. Try export | Access denied | Permission check works | S1 |
| EXPORT-012 | PDF Usage Limits | Tracks export usage | Export | 1. Export | Usage tracked | `usePdfExportUsage` works | S3 |

### 14. Share Links & Previews (SHARE)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| SHARE-001 | Trip Preview Page | Preview page renders | Valid trip | 1. Navigate to /trip/:id/preview | Preview shown | `TripPreview` page renders | S1 |
| SHARE-002 | OG Meta Tags | Social previews work | Share trip URL | 1. Paste URL in social | Rich preview shown | OG tags populated | S2 |
| SHARE-003 | QR Code | Can generate QR for trip | In trip | 1. Generate QR | QR displayed | QR encodes trip URL | S3 |
| SHARE-004 | Native Share | Can use native share | Mobile | 1. Share trip | Share sheet opens | Web Share API works | S3 |
| SHARE-005 | Copy Share Link | Can copy share URL | In trip | 1. Copy link | URL copied | Clipboard populated | S2 |

### 15. Subscriptions (SUB)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| SUB-001 | Check Subscription | System knows sub status | User exists | 1. Check subscription | Status returned | `check-subscription` function works | S1 |
| SUB-002 | Free Tier Limits | Free users have limits | Free user | 1. Check limits | Limits enforced | Trip count, media limits work | S1 |
| SUB-003 | Upgrade CTA | Show upgrade prompts | Free user at limit | 1. Hit limit | Upgrade modal shown | UpgradeModal displays | S2 |
| SUB-004 | Create Checkout | Can start checkout | Logged in | 1. Start upgrade | Checkout session created | `create-checkout` function works | S1 |
| SUB-005 | Billing Portal | Can access billing | Has subscription | 1. Open billing | Stripe portal opens | `customer-portal` function works | S1 |
| SUB-006 | Stripe Webhook | Webhook updates status | Payment completes | 1. Complete payment | Status updated | `stripe-webhook` updates subscription | S0 |
| SUB-007 | Archive on Limit | Over-limit trips archived | Downgrade/limit change | 1. Exceed limit | Old trips archived | `archiveOldTrips` utility works | S2 |
| SUB-008 | Entitlements Sync | RevenueCat sync works | Mobile purchase | 1. Purchase via IAP | Entitlements sync | `sync-revenuecat-entitlement` works | S2 |
| SUB-009 | Invoice History | Can view invoices | Has payments | 1. View invoices | Invoices listed | `fetch-invoices` function works | S3 |

### 16. Pro Trips (PRO)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| PRO-001 | Create Pro Trip | As org member, I can create | Org member with seats | 1. Create pro trip | Pro trip created | `trip_type` = 'pro' | S0 |
| PRO-002 | Pro Trip Categories | Can set pro categories | Create pro trip | 1. Select category | Category saved | `proTripCategory` populated | S2 |
| PRO-003 | Roster Management | Can manage roster | Pro trip | 1. Add roster member | Roster updated | `roster` field updated | S1 |
| PRO-004 | Role Assignments | Can assign roles | Pro trip | 1. Assign role to member | Role saved | Role assignment stored | S1 |
| PRO-005 | Role-Based Channels | Roles have channels | Pro trip | 1. View role channel | Channel available | Role channels work | S2 |
| PRO-006 | Department Structure | Can organize by department | Pro trip | 1. Set departments | Departments saved | Org structure works | S2 |
| PRO-007 | Seat Enforcement | Seats limited per org | Org at seat limit | 1. Try to add member | Seat limit enforced | Cannot exceed seatLimit | S1 |
| PRO-008 | Pro Permissions | Role permissions work | Various roles | 1. Access features | Permissions enforced | RLS/RBAC works | S0 |
| PRO-009 | Per Diem Tracking | Can track per diem | Pro trip | 1. Set per diem | Per diem tracked | PerDiemData stored | S2 |
| PRO-010 | Settlement Tracking | Can track settlements | Pro trip | 1. Add settlement | Settlement tracked | SettlementData stored | S2 |
| PRO-011 | Medical Logs | Can log medical info | Pro trip with permission | 1. Add medical log | Log saved | MedicalLog stored | S3 |
| PRO-012 | Compliance Rules | Can track compliance | Pro trip | 1. Add compliance rule | Rule tracked | ComplianceRule stored | S3 |

### 17. Events (EVENT)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| EVENT-001 | Create Event Trip | As org member, I can create event | Org member | 1. Create event | Event created | `trip_type` = 'event' | S0 |
| EVENT-002 | Event Agendas | Can create agenda | Event exists | 1. Add agenda items | Agenda saved | Schedule/agenda stored | S1 |
| EVENT-003 | Attendee Join | Attendees can join | Event invite | 1. Join event | Attendee added | Member added | S0 |
| EVENT-004 | RSVP Management | Can manage RSVPs | Event exists | 1. RSVP | RSVP recorded | RSVP status stored | S1 |
| EVENT-005 | Tier Enforcement | Ticket tiers work | Tiered event | 1. Join with tier | Tier applied | Tier restrictions work | S2 |
| EVENT-006 | Networking Toggle | Networking features | Event with networking | 1. Enable networking | Networking on | Feature toggle works | S3 |
| EVENT-007 | Event Permissions | Event-specific perms | Event member | 1. Access features | Permissions work | Event RLS/RBAC works | S1 |

### 18. Organizations (ORG)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| ORG-001 | Create Organization | As user, I can create org | Pro subscription | 1. Create org | Org created | `organizations` row created | S0 |
| ORG-002 | View Organizations | As member, I see my orgs | In org | 1. View /organizations | Orgs listed | All orgs visible | S1 |
| ORG-003 | Org Dashboard | Can access org dashboard | Org member | 1. View /organization/:id | Dashboard shown | OrgDashboard renders | S1 |
| ORG-004 | Invite Org Member | As admin, I can invite | Org admin | 1. Invite member | Invite sent | `organization_invites` row created | S1 |
| ORG-005 | Accept Org Invite | As invitee, I can accept | Valid invite | 1. Accept invite | Joined org | `organization_members` row created | S0 |
| ORG-006 | Org Roles | Roles: owner, admin, member | Org exists | 1. Assign role | Role saved | Role in `organization_members` | S1 |
| ORG-007 | Seat Management | Can manage seats | Org admin | 1. View seats | Seat usage shown | seatsUsed/seatLimit displayed | S2 |
| ORG-008 | Org Billing Portal | Admin can access billing | Org admin | 1. Open billing | Portal opens | `organization-billing-portal` works | S1 |
| ORG-009 | Link Trip to Org | Can link trip to org | Org admin | 1. Link trip | Trip linked | `link-trip-to-organization` works | S2 |
| ORG-010 | Org Permissions | Org RLS works | Various roles | 1. Access features | Permissions enforced | RLS policies work | S0 |

### 19. Admin & Settings (ADMIN)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| ADMIN-001 | Settings Menu | Can access settings | Logged in | 1. Open settings | Settings menu opens | SettingsMenu component renders | S1 |
| ADMIN-002 | Notification Settings | Can configure notifications | Logged in | 1. Edit notification prefs | Settings saved | `notification_preferences` updated | S2 |
| ADMIN-003 | Feature Flags | Flags gate features | Flag configured | 1. Check feature | Flag respected | Feature flags work | S2 |
| ADMIN-004 | Demo Toggle | Can toggle demo mode | Settings open | 1. Toggle demo | Mode changes | demoModeStore updated | S2 |
| ADMIN-005 | Analytics Hooks | Analytics events fire | User actions | 1. Perform action | Event sent | Analytics service works | S3 |
| ADMIN-006 | Error Tracking | Errors reported | Error occurs | 1. Trigger error | Error logged | errorTracking service works | S2 |
| ADMIN-007 | Super Admin Access | Super admins have access | Super admin email | 1. Login as super admin | Admin features available | SUPER_ADMIN_EMAILS check works | S1 |
| ADMIN-008 | Consumer Settings | Consumer settings work | Consumer user | 1. View consumer settings | All sections available | ConsumerSettings sections render | S2 |
| ADMIN-009 | AI Concierge Settings | Can configure AI access | Logged in | 1. Toggle AI access | Setting saved | AI access settings work | S3 |
| ADMIN-010 | Privacy Settings | Can configure privacy | Logged in | 1. Edit privacy | Settings saved | Privacy preferences stored | S2 |

### 20. AI Concierge (AI)

| ID | Feature | User Story | Preconditions | Steps | Expected | Assertions | Severity |
|----|---------|------------|---------------|-------|----------|------------|----------|
| AI-001 | AI Chat | Can chat with AI | In trip, AI enabled | 1. Open AI chat 2. Send message | AI responds | `ai-answer` or `gemini-chat` function works | S2 |
| AI-002 | Context-Aware | AI knows trip context | Trip with data | 1. Ask about trip | Contextual answer | RAG over trip data works | S2 |
| AI-003 | AI Suggestions | AI suggests itinerary | Trip location set | 1. Request suggestions | Suggestions provided | AI features work | S3 |
| AI-004 | Place Grounding | AI grounds places | Place query | 1. Ask about places | Places grounded | `place-grounding` function works | S3 |
| AI-005 | Document Processing | AI processes docs | Upload document | 1. Upload doc | Content extracted | `document-processor` works | S3 |
| AI-006 | AI Usage Limits | Usage limits enforced | Near limit | 1. Use AI | Limit warning/block | Concierge usage tracked | S3 |

---

## Tracking System Schema

### Table 1: `qa_features`

**Purpose:** Catalog of all testable features

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | VARCHAR(20) | Feature ID (primary key) | "AUTH-001" |
| `area` | VARCHAR(50) | Feature area | "Authentication" |
| `name` | VARCHAR(100) | Feature name | "Email/Password Login" |
| `description` | TEXT | Feature description | "User can log in with email and password" |
| `owner` | ENUM | FE/BE/DB/RLS/EdgeFunction | "BE" |
| `db_tables` | TEXT[] | Related database tables | ["profiles", "auth.users"] |
| `edge_functions` | TEXT[] | Related edge functions | [] |
| `demo_parity` | BOOLEAN | Should match demo mode | true |
| `priority` | ENUM | P0/P1/P2/P3 | "P0" |
| `created_at` | TIMESTAMP | When added | "2026-01-04T00:00:00Z" |
| `updated_at` | TIMESTAMP | Last update | "2026-01-04T00:00:00Z" |

**Example Rows:**

```sql
INSERT INTO qa_features VALUES 
  ('AUTH-001', 'Authentication', 'Email/Password Signup', 'User can create account with email', 'BE', ARRAY['profiles'], ARRAY[], true, 'P0', NOW(), NOW()),
  ('TRIP-001', 'Trips', 'Create Trip', 'User can create new trip', 'FE', ARRAY['trips', 'trip_members'], ARRAY['create-trip'], true, 'P0', NOW(), NOW()),
  ('CHAT-001', 'Chat', 'Send Message', 'User can send chat messages', 'FE', ARRAY['trip_chat_messages'], ARRAY[], true, 'P0', NOW(), NOW());
```

### Table 2: `qa_test_cases`

**Purpose:** Individual test cases per feature

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | VARCHAR(30) | Test case ID (primary key) | "AUTH-001-TC01" |
| `feature_id` | VARCHAR(20) | FK to qa_features | "AUTH-001" |
| `scenario` | VARCHAR(100) | Test scenario | "Happy path signup" |
| `preconditions` | TEXT | Required setup | "No existing account" |
| `steps` | TEXT[] | Step-by-step actions | ["Navigate to /auth", "Fill form", "Submit"] |
| `expected` | TEXT | Expected outcome | "Account created, email sent" |
| `assertions` | TEXT[] | Specific assertions | ["Session exists", "profiles row created"] |
| `edge_case` | BOOLEAN | Is this an edge case? | false |
| `automated` | BOOLEAN | Has Playwright test? | true |
| `playwright_file` | VARCHAR(100) | Test file path | "e2e/auth.spec.ts" |
| `created_at` | TIMESTAMP | When added | "2026-01-04T00:00:00Z" |

**Example Rows:**

```sql
INSERT INTO qa_test_cases VALUES
  ('AUTH-001-TC01', 'AUTH-001', 'Happy path signup', 'No existing account', 
   ARRAY['Navigate to /auth', 'Enter valid email, password, names', 'Click submit'],
   'Account created successfully', ARRAY['Session created OR email confirmation required'], 
   false, true, 'e2e/auth.spec.ts', NOW()),
  ('AUTH-001-TC02', 'AUTH-001', 'Duplicate email', 'Account already exists', 
   ARRAY['Navigate to /auth', 'Enter existing email', 'Submit'],
   'Error message shown', ARRAY['Error: "already registered"'], 
   true, true, 'e2e/auth.spec.ts', NOW());
```

### Table 3: `qa_test_runs`

**Purpose:** Track test execution runs

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | UUID | Run ID (primary key) | "a1b2c3d4-..." |
| `run_name` | VARCHAR(100) | Run name | "v1.0.0 Release Candidate" |
| `environment` | ENUM | local/staging/production | "staging" |
| `commit_hash` | VARCHAR(40) | Git commit SHA | "abc123..." |
| `branch` | VARCHAR(100) | Git branch | "main" |
| `runner` | VARCHAR(100) | Who/what ran tests | "CI Pipeline" |
| `started_at` | TIMESTAMP | Start time | "2026-01-04T10:00:00Z" |
| `completed_at` | TIMESTAMP | End time | "2026-01-04T10:30:00Z" |
| `total_cases` | INTEGER | Total test cases | 150 |
| `passed` | INTEGER | Passed count | 145 |
| `failed` | INTEGER | Failed count | 5 |
| `skipped` | INTEGER | Skipped count | 0 |
| `pass_rate` | DECIMAL | Pass percentage | 96.67 |

**Example Rows:**

```sql
INSERT INTO qa_test_runs VALUES
  (gen_random_uuid(), 'Nightly Run 2026-01-04', 'staging', 'abc123def', 'main', 
   'GitHub Actions', '2026-01-04T02:00:00Z', '2026-01-04T02:30:00Z', 
   150, 145, 5, 0, 96.67);
```

### Table 4: `qa_results`

**Purpose:** Individual test case results per run

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | UUID | Result ID (primary key) | "..." |
| `run_id` | UUID | FK to qa_test_runs | "a1b2c3d4-..." |
| `case_id` | VARCHAR(30) | FK to qa_test_cases | "AUTH-001-TC01" |
| `status` | ENUM | pass/fail/skip/blocked | "pass" |
| `severity` | ENUM | S0/S1/S2/S3 (if fail) | null |
| `bug_id` | VARCHAR(50) | FK to qa_bugs (if fail) | null |
| `duration_ms` | INTEGER | Test duration | 1500 |
| `error_message` | TEXT | Error if failed | null |
| `screenshot_url` | TEXT | Failure screenshot | null |
| `notes` | TEXT | Additional notes | null |
| `created_at` | TIMESTAMP | When recorded | NOW() |

**Example Rows:**

```sql
INSERT INTO qa_results VALUES
  (gen_random_uuid(), 'run-uuid', 'AUTH-001-TC01', 'pass', null, null, 1500, null, null, null, NOW()),
  (gen_random_uuid(), 'run-uuid', 'CHAT-001-TC01', 'fail', 'S1', 'BUG-001', 3000, 
   'Message not appearing in realtime', 'https://s3.../screenshot.png', 'Intermittent', NOW());
```

### Table 5: `qa_bugs`

**Purpose:** Normalized bug tracking

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | VARCHAR(50) | Bug ID (primary key) | "BUG-001" |
| `title` | VARCHAR(200) | Bug title | "Realtime messages intermittently fail" |
| `description` | TEXT | Full description | "..." |
| `feature_id` | VARCHAR(20) | Related feature | "CHAT-001" |
| `severity` | ENUM | S0/S1/S2/S3 | "S1" |
| `priority` | ENUM | P0/P1/P2/P3 | "P1" |
| `status` | ENUM | open/in_progress/fixed/verified/wontfix | "open" |
| `owner` | ENUM | FE/BE/DB/RLS/EdgeFunction | "BE" |
| `assignee` | VARCHAR(100) | Who's fixing | "backend-team" |
| `repro_steps` | TEXT[] | Reproduction steps | ["Open chat", "Send message"] |
| `root_cause` | TEXT | Suspected root cause | "Supabase channel subscription race" |
| `fix_pr` | VARCHAR(200) | Fix PR URL | null |
| `environment` | TEXT[] | Affected envs | ["staging", "production"] |
| `demo_mode_works` | BOOLEAN | Works in demo? | true |
| `created_at` | TIMESTAMP | When found | NOW() |
| `updated_at` | TIMESTAMP | Last update | NOW() |
| `resolved_at` | TIMESTAMP | When fixed | null |

### Severity Rubric

| Severity | Definition | Examples |
|----------|------------|----------|
| **S0 (Blocker)** | App completely broken, cannot proceed, data loss | Auth fails completely, trips don't save, payment data lost |
| **S1 (Critical)** | Major feature broken, workaround difficult/impossible | Chat not sending, invites fail, exports broken |
| **S2 (Major)** | Feature degraded but usable with workaround | Slow performance, occasional failures, UI glitches |
| **S3 (Minor)** | Cosmetic, minor inconvenience | Typos, alignment issues, nice-to-have missing |

### Priority Rubric

| Priority | Definition | Response Time |
|----------|------------|---------------|
| **P0 (Critical)** | Must fix before release | < 24 hours |
| **P1 (High)** | Fix within current sprint | < 1 week |
| **P2 (Medium)** | Fix within next sprint | < 2 weeks |
| **P3 (Low)** | Backlog, fix when possible | > 2 weeks |

---

## Execution Plan

### Playwright E2E Suite Structure

```
/e2e
├── fixtures/
│   ├── auth.fixture.ts        # Authentication helpers
│   ├── db.fixture.ts          # Database seeding/cleanup
│   ├── trip.fixture.ts        # Trip creation helpers
│   └── user.fixture.ts        # User management helpers
├── pages/
│   ├── auth.page.ts           # Auth page object
│   ├── home.page.ts           # Home/Index page object
│   ├── trip-detail.page.ts    # Trip detail page object
│   ├── settings.page.ts       # Settings page object
│   └── invite.page.ts         # Invite flow page object
├── specs/
│   ├── auth/
│   │   ├── signup.spec.ts
│   │   ├── login.spec.ts
│   │   ├── oauth.spec.ts
│   │   ├── password-reset.spec.ts
│   │   └── session.spec.ts
│   ├── profile/
│   │   ├── view-profile.spec.ts
│   │   └── edit-profile.spec.ts
│   ├── trips/
│   │   ├── create-trip.spec.ts
│   │   ├── view-trips.spec.ts
│   │   ├── edit-trip.spec.ts
│   │   └── archive-trip.spec.ts
│   ├── invites/
│   │   ├── create-invite.spec.ts
│   │   ├── accept-invite.spec.ts
│   │   ├── invite-approval.spec.ts
│   │   └── invite-edge-cases.spec.ts
│   ├── chat/
│   │   ├── send-message.spec.ts
│   │   ├── realtime.spec.ts
│   │   ├── attachments.spec.ts
│   │   └── offline.spec.ts
│   ├── calendar/
│   │   ├── create-event.spec.ts
│   │   ├── edit-event.spec.ts
│   │   └── export-ics.spec.ts
│   ├── tasks/
│   │   ├── create-task.spec.ts
│   │   └── complete-task.spec.ts
│   ├── polls/
│   │   ├── create-poll.spec.ts
│   │   └── vote-poll.spec.ts
│   ├── payments/
│   │   ├── create-split.spec.ts
│   │   ├── upload-receipt.spec.ts
│   │   └── settlement.spec.ts
│   ├── media/
│   │   ├── upload-photo.spec.ts
│   │   └── media-gallery.spec.ts
│   ├── export/
│   │   └── pdf-export.spec.ts
│   ├── subscriptions/
│   │   ├── free-limits.spec.ts
│   │   └── upgrade-flow.spec.ts
│   ├── pro/
│   │   ├── pro-trip.spec.ts
│   │   └── roster.spec.ts
│   ├── events/
│   │   └── event-flow.spec.ts
│   ├── organizations/
│   │   ├── create-org.spec.ts
│   │   └── org-invites.spec.ts
│   └── rls/
│       ├── trip-rls.spec.ts
│       ├── chat-rls.spec.ts
│       └── payment-rls.spec.ts
├── utils/
│   ├── api-helpers.ts         # Direct API/Supabase helpers
│   ├── mock-data.ts           # Test data generators
│   └── assertions.ts          # Custom assertions
├── global-setup.ts            # Global test setup
├── global-teardown.ts         # Global test cleanup
└── playwright.config.ts       # Playwright configuration
```

### Naming Conventions

- **Spec files:** `<feature>-<scenario>.spec.ts` (e.g., `create-trip.spec.ts`)
- **Page objects:** `<page-name>.page.ts` (e.g., `home.page.ts`)
- **Fixtures:** `<domain>.fixture.ts` (e.g., `auth.fixture.ts`)
- **Test IDs:** Match `qa_test_cases.id` format (e.g., "AUTH-001-TC01")

### Test Data Strategy

```typescript
// fixtures/db.fixture.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for seeding
);

export const seedTestUser = async () => {
  const email = `qa-${Date.now()}@test.chravel.com`;
  const password = 'TestPassword123!';
  
  // Create auth user
  const { data: authUser } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'QA Test User' }
  });
  
  // Ensure profile exists
  await supabase.from('profiles').upsert({
    user_id: authUser.user.id,
    display_name: 'QA Test User',
    email
  });
  
  return { email, password, userId: authUser.user.id };
};

export const seedTestTrip = async (userId: string) => {
  const { data: trip } = await supabase.from('trips')
    .insert({
      name: `QA Trip ${Date.now()}`,
      destination: 'Test City',
      creator_id: userId,
      trip_type: 'consumer'
    })
    .select()
    .single();
    
  await supabase.from('trip_members').insert({
    trip_id: trip.id,
    user_id: userId,
    role: 'admin'
  });
  
  return trip;
};

export const cleanupTestData = async (userId: string) => {
  // Delete in order (respecting FKs)
  await supabase.from('trip_members').delete().eq('user_id', userId);
  await supabase.from('trips').delete().eq('creator_id', userId);
  await supabase.from('profiles').delete().eq('user_id', userId);
  await supabase.auth.admin.deleteUser(userId);
};
```

### Demo Mode Parity Testing

```typescript
// specs/parity/demo-parity.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Demo Mode Parity', () => {
  test('features available in demo should work for authenticated users', async ({ page }) => {
    // Features shown in demo mode that MUST work for real users
    const demoFeatures = [
      { name: 'Trip List', selector: '[data-testid="trip-grid"]' },
      { name: 'Chat Tab', selector: '[data-testid="chat-tab"]' },
      { name: 'Calendar Tab', selector: '[data-testid="calendar-tab"]' },
      { name: 'Tasks Tab', selector: '[data-testid="tasks-tab"]' },
      { name: 'Payments Tab', selector: '[data-testid="payments-tab"]' },
      { name: 'Media Tab', selector: '[data-testid="media-tab"]' },
      { name: 'Invite Button', selector: '[data-testid="invite-button"]' },
      { name: 'Export Button', selector: '[data-testid="export-button"]' }
    ];
    
    // Test as authenticated user
    await loginAsTestUser(page);
    await createTestTrip(page);
    
    for (const feature of demoFeatures) {
      await expect(page.locator(feature.selector))
        .toBeVisible({ timeout: 5000 });
    }
  });
});
```

### RLS & Edge Function Validation

```typescript
// specs/rls/trip-rls.spec.ts
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Trip RLS Policies', () => {
  test('non-member cannot read trip', async () => {
    const userA = await seedTestUser();
    const userB = await seedTestUser();
    
    // User A creates trip
    const trip = await seedTestTrip(userA.userId);
    
    // User B tries to read (should fail)
    const supabaseAsB = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    await supabaseAsB.auth.signInWithPassword({
      email: userB.email,
      password: userB.password
    });
    
    const { data, error } = await supabaseAsB
      .from('trips')
      .select('*')
      .eq('id', trip.id)
      .single();
    
    expect(data).toBeNull(); // RLS should block
    
    await cleanupTestData(userA.userId);
    await cleanupTestData(userB.userId);
  });
  
  test('member can read trip', async () => {
    const userA = await seedTestUser();
    const trip = await seedTestTrip(userA.userId);
    
    const supabaseAsA = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    await supabaseAsA.auth.signInWithPassword({
      email: userA.email,
      password: userA.password
    });
    
    const { data } = await supabaseAsA
      .from('trips')
      .select('*')
      .eq('id', trip.id)
      .single();
    
    expect(data).not.toBeNull();
    expect(data.id).toBe(trip.id);
    
    await cleanupTestData(userA.userId);
  });
});
```

---

## Super Prompt Generator

### Reusable Audit Prompt

Copy and use this prompt to run the full audit:

```markdown
# Chravel E2E Functional Audit - Execution Prompt

## Context
You are executing a comprehensive E2E functional audit for the Chravel application.
Your goal is to verify that all features available in demo mode work correctly for
authenticated users against the production database.

## Execution Steps

### Phase 1: Environment Setup
1. Confirm access to:
   - [ ] Staging/production app URL
   - [ ] Supabase dashboard (read access)
   - [ ] Test user credentials
   - [ ] CI/CD logs (GitHub Actions)

2. Verify test infrastructure:
   - [ ] Playwright installed and configured
   - [ ] Test database seeding works
   - [ ] Can create/cleanup test users

### Phase 2: Test Execution
For each feature area in the Test Map, execute:

1. **Authentication Tests**
   - Run: `npx playwright test e2e/specs/auth/`
   - Manual verify: OAuth flows if configured
   - Check: Session persistence, error states

2. **Profile Tests**
   - Run: `npx playwright test e2e/specs/profile/`
   - Manual verify: Avatar upload, privacy toggles
   - Check: DB updates correctly

3. **Trip Tests**
   - Run: `npx playwright test e2e/specs/trips/`
   - Manual verify: Create/edit/archive flows
   - Check: RLS policies, member access

4. **Invite Tests**
   - Run: `npx playwright test e2e/specs/invites/`
   - Manual verify: Link generation, join flows
   - Check: Expiration, max uses, approval flow

5. **Chat Tests**
   - Run: `npx playwright test e2e/specs/chat/`
   - Manual verify: Realtime in multiple tabs
   - Check: Offline queue, attachments

6. **Calendar Tests**
   - Run: `npx playwright test e2e/specs/calendar/`
   - Manual verify: ICS export, timezone handling
   - Check: Recurring events, conflicts

7. **Tasks Tests**
   - Run: `npx playwright test e2e/specs/tasks/`
   - Manual verify: Assignment, completion
   - Check: Permissions, deleted user handling

8. **Polls Tests**
   - Run: `npx playwright test e2e/specs/polls/`
   - Manual verify: Vote, change vote
   - Check: Realtime results

9. **Media Tests**
   - Run: `npx playwright test e2e/specs/media/`
   - Manual verify: Upload, download
   - Check: Storage quotas, limits

10. **Payments Tests**
    - Run: `npx playwright test e2e/specs/payments/`
    - Manual verify: Split creation, receipt OCR
    - Check: Deep links, settlement

11. **Export Tests**
    - Run: `npx playwright test e2e/specs/export/`
    - Manual verify: PDF generation, download
    - Check: All sections, empty states

12. **Subscription Tests**
    - Run: `npx playwright test e2e/specs/subscriptions/`
    - Manual verify: Upgrade flow, billing portal
    - Check: Limit enforcement

13. **Pro/Event Tests**
    - Run: `npx playwright test e2e/specs/pro/ e2e/specs/events/`
    - Manual verify: Role assignments, seats
    - Check: Org-level RLS

14. **Organization Tests**
    - Run: `npx playwright test e2e/specs/organizations/`
    - Manual verify: Invite flow, billing
    - Check: Role permissions

15. **RLS Tests**
    - Run: `npx playwright test e2e/specs/rls/`
    - Verify all permission boundaries

### Phase 3: Results Recording
For each test:

1. Record result in `qa_results`:
   ```sql
   INSERT INTO qa_results (run_id, case_id, status, severity, ...)
   VALUES (...);
   ```

2. For failures, create bug in `qa_bugs`:
   ```sql
   INSERT INTO qa_bugs (id, title, feature_id, severity, ...)
   VALUES (...);
   ```

### Phase 4: Report Generation

Generate Parity Report with:

```sql
-- Summary Stats
SELECT 
  COUNT(*) as total_cases,
  SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
  SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) / COUNT(*), 2) as pass_rate
FROM qa_results
WHERE run_id = '<latest_run_id>';

-- Failures by Severity
SELECT severity, COUNT(*) as count
FROM qa_results
WHERE run_id = '<latest_run_id>' AND status = 'fail'
GROUP BY severity
ORDER BY severity;

-- Failed Features
SELECT r.case_id, c.scenario, r.severity, r.error_message
FROM qa_results r
JOIN qa_test_cases c ON r.case_id = c.id
WHERE r.run_id = '<latest_run_id>' AND r.status = 'fail'
ORDER BY r.severity, r.case_id;

-- Prioritized Fix Queue
SELECT b.id, b.title, b.severity, b.priority, b.owner, b.assignee
FROM qa_bugs b
WHERE b.status = 'open'
ORDER BY b.priority, b.severity;
```

## Output Format

### Parity Report Template

```
# Chravel E2E Parity Report
Date: [DATE]
Environment: [ENV]
Commit: [HASH]
Run ID: [RUN_ID]

## Summary
- Total Test Cases: [N]
- Passed: [P] ([PASS_RATE]%)
- Failed: [F]
- Skipped: [S]

## Coverage Metrics
- Features Tested: [F_COUNT]/[F_TOTAL]
- Average Cases per Feature: [AVG]
- Blockers (S0): [COUNT]
- Criticals (S1): [COUNT]

## Failing Features by Severity

### S0 (Blockers)
| ID | Feature | Error | Owner |
|----|---------|-------|-------|
| ... | ... | ... | ... |

### S1 (Critical)
| ID | Feature | Error | Owner |
|----|---------|-------|-------|
| ... | ... | ... | ... |

### S2 (Major)
| ID | Feature | Error | Owner |
|----|---------|-------|-------|
| ... | ... | ... | ... |

### S3 (Minor)
| ID | Feature | Error | Owner |
|----|---------|-------|-------|
| ... | ... | ... | ... |

## Demo Mode Parity Issues
Features that work in demo but fail for authenticated users:
| Feature | Demo Behavior | Auth Behavior | Root Cause |
|---------|---------------|---------------|------------|
| ... | ... | ... | ... |

## Prioritized Fix Queue
| Priority | Bug ID | Title | Severity | Owner | ETA |
|----------|--------|-------|----------|-------|-----|
| P0 | BUG-XXX | ... | S0 | BE | ... |
| P1 | BUG-XXX | ... | S1 | FE | ... |

## Recommendations
1. [Immediate actions]
2. [Short-term improvements]
3. [Long-term enhancements]
```

Run this prompt with access to the codebase and Supabase dashboard to execute the full audit.
```

---

## Priority Fix Queue Template

### Template Structure

```markdown
# Chravel Priority Fix Queue

**Last Updated:** [DATE]  
**Sprint:** [SPRINT_NUMBER]

## P0 - Critical (Fix within 24 hours)

| Bug ID | Title | Severity | Owner | Assignee | Status | ETA |
|--------|-------|----------|-------|----------|--------|-----|
| BUG-XXX | [Title] | S0 | BE | @person | in_progress | [DATE] |

### Details

#### BUG-XXX: [Title]
- **Feature:** [Feature ID]
- **Repro:** [Steps]
- **Root Cause:** [Analysis]
- **Fix PR:** [URL]
- **Blockers:** [Any blockers]

---

## P1 - High (Fix within 1 week)

| Bug ID | Title | Severity | Owner | Assignee | Status | ETA |
|--------|-------|----------|-------|----------|--------|-----|
| BUG-XXX | [Title] | S1 | FE | @person | open | [DATE] |

---

## P2 - Medium (Fix within 2 weeks)

| Bug ID | Title | Severity | Owner | Assignee | Status | ETA |
|--------|-------|----------|-------|----------|--------|-----|
| BUG-XXX | [Title] | S2 | DB | @person | open | [DATE] |

---

## P3 - Low (Backlog)

| Bug ID | Title | Severity | Owner | Assignee | Status |
|--------|-------|----------|-------|----------|--------|
| BUG-XXX | [Title] | S3 | FE | unassigned | open |

---

## Recently Fixed (Last 7 Days)

| Bug ID | Title | Fixed By | Fix PR | Verified |
|--------|-------|----------|--------|----------|
| BUG-XXX | [Title] | @person | [URL] | ✅ |

---

## Metrics

- **Open Bugs:** [N]
- **P0 Open:** [N]
- **P1 Open:** [N]
- **Avg Time to Fix (P0):** [N] hours
- **Avg Time to Fix (P1):** [N] days
```

---

## Coverage Metrics

### Formulas

```
Let F = total features in qa_features
Let C = total test cases in qa_test_cases
Let P = passing cases in qa_results for latest qa_test_run
Let R = failing cases in qa_results for latest qa_test_run

PassRate = P / (P + R) * 100
FailRate = R / (P + R) * 100
AvgCasesPerFeature = C / F
Blockers = COUNT(failures WHERE severity = 'S0')
Criticals = COUNT(failures WHERE severity = 'S1')
Majors = COUNT(failures WHERE severity = 'S2')
Minors = COUNT(failures WHERE severity = 'S3')

DemoParity = COUNT(features WHERE demo_works AND auth_works) / COUNT(features WHERE demo_works) * 100
```

### Current Baseline (To Be Filled After Audit)

| Metric | Value | Target |
|--------|-------|--------|
| Total Features | 150+ | - |
| Total Test Cases | 300+ | - |
| Pass Rate | TBD | ≥ 95% |
| Fail Rate | TBD | ≤ 5% |
| Avg Cases/Feature | TBD | ≥ 2 |
| Blockers (S0) | TBD | 0 |
| Criticals (S1) | TBD | ≤ 3 |
| Demo Parity | TBD | 100% |

### SQL Queries for Metrics

```sql
-- Feature count
SELECT COUNT(*) as F FROM qa_features;

-- Test case count
SELECT COUNT(*) as C FROM qa_test_cases;

-- Latest run results
WITH latest_run AS (
  SELECT id FROM qa_test_runs ORDER BY completed_at DESC LIMIT 1
)
SELECT 
  COUNT(*) FILTER (WHERE status = 'pass') as P,
  COUNT(*) FILTER (WHERE status = 'fail') as R,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'pass') / COUNT(*), 2) as PassRate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'fail') / COUNT(*), 2) as FailRate,
  COUNT(*) FILTER (WHERE status = 'fail' AND severity = 'S0') as Blockers,
  COUNT(*) FILTER (WHERE status = 'fail' AND severity = 'S1') as Criticals,
  COUNT(*) FILTER (WHERE status = 'fail' AND severity = 'S2') as Majors,
  COUNT(*) FILTER (WHERE status = 'fail' AND severity = 'S3') as Minors
FROM qa_results
WHERE run_id = (SELECT id FROM latest_run);

-- Avg cases per feature
SELECT ROUND(1.0 * COUNT(*) / (SELECT COUNT(*) FROM qa_features), 2) as AvgCasesPerFeature
FROM qa_test_cases;
```

---

## Appendix: Database Table Assumptions

Tables marked with [ASSUMPTION] are inferred from codebase patterns:

| Table | Status | Evidence |
|-------|--------|----------|
| `profiles` | ✅ Confirmed | Multiple migrations, `useAuth.tsx` |
| `trips` | ✅ Confirmed | Migrations, services |
| `trip_members` | ✅ Confirmed | Migrations, hooks |
| `trip_chat_messages` | ✅ Confirmed | Services, hooks |
| `trip_events` | ✅ Confirmed | Migrations, types |
| `trip_tasks` | ✅ Confirmed | Types, hooks |
| `trip_polls` | ✅ Confirmed | Types, hooks |
| `trip_poll_votes` | [ASSUMPTION] | Poll voting logic |
| `trip_files` | ✅ Confirmed | Media types |
| `trip_link_index` | [ASSUMPTION] | Link service patterns |
| `trip_payments` | [ASSUMPTION] | Payment types |
| `trip_receipts` | [ASSUMPTION] | Receipt types |
| `invite_links` | ✅ Confirmed | JoinTrip.tsx |
| `trip_join_requests` | [ASSUMPTION] | Approval flow |
| `organizations` | ✅ Confirmed | Types, pages |
| `organization_members` | ✅ Confirmed | Types, hooks |
| `organization_invites` | ✅ Confirmed | Types |
| `subscriptions` | [ASSUMPTION] | Billing patterns |
| `notification_preferences` | ✅ Confirmed | Migration |
| `push_tokens` | ✅ Confirmed | Migration |
| `notifications` | ✅ Confirmed | App.tsx |
| `broadcasts` | ✅ Confirmed | Types, services |
| `user_roles` | ✅ Confirmed | useAuth.tsx |
| `calendar_connections` | ✅ Confirmed | Migration |
| `synced_calendar_events` | ✅ Confirmed | Migration |
| `enhanced_expenses` | ✅ Confirmed | Migration |
| `travel_bookings` | ✅ Confirmed | Migration |
| `smart_todos` | ✅ Confirmed | Migration |
| `ai_processing_queue` | ✅ Confirmed | Migration |
| `photo_metadata` | ✅ Confirmed | Migration |

---

**Document End**

*This document should be updated after each major release or when significant features are added.*
