
# Event Permissions: Role-Based Access Control Implementation

## Overview

Implement proper permission checks for Event trips so that **attendees have restricted access** while **organizers/admins maintain full control**. This ensures event integrity while allowing collaborative features like Chat and Media sharing.

---

## Permission Matrix

| Feature | Attendee | Organizer/Admin |
|---------|----------|-----------------|
| **Agenda** | View only | Create, Edit, Delete, Upload |
| **Calendar** | View only | Create, Edit, Delete |
| **Chat** | Full access (send/receive) | Full access + moderation |
| **Media** | Upload, Download, Delete own | Upload, Download, Delete any |
| **Line-up** | View only | Create, Edit, Delete |
| **Polls** | Vote only | Create, Close, Delete + Vote |
| **Tasks** | View only | Create, Edit, Delete |

---

## Technical Implementation

### Phase 1: Extend `useEventPermissions` Hook

**File**: `src/hooks/useEventPermissions.ts`

Add event-specific feature permissions that distinguish between organizer and attendee roles:

```typescript
export interface EventFeaturePermissions {
  agenda: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canUpload: boolean };
  calendar: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
  chat: { canView: boolean; canSend: boolean; canDeleteOwn: boolean; canDeleteAny: boolean };
  media: { canView: boolean; canUpload: boolean; canDeleteOwn: boolean; canDeleteAny: boolean };
  lineup: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
  polls: { canView: boolean; canVote: boolean; canCreate: boolean; canClose: boolean; canDelete: boolean };
  tasks: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
}
```

Add logic to determine if user is the **trip creator** by querying `trips.created_by` in addition to checking `trip_admins` table.

### Phase 2: Update EventDetailContent

**File**: `src/components/events/EventDetailContent.tsx`

Pass granular permissions to each tab component instead of just `isAdmin` boolean:

```typescript
// Current
<EventTasksTab eventId={tripId} isAdmin={showAsAdmin} />

// Updated
<EventTasksTab 
  eventId={tripId} 
  permissions={eventPermissions.tasks}
/>
```

### Phase 3: Update Individual Tab Components

#### 3a. AgendaModal

**File**: `src/components/events/AgendaModal.tsx`

**Current**: Uses `isAdmin` prop to show/hide controls
**Change**: Accept `permissions` prop with granular access

```typescript
interface AgendaModalProps {
  eventId: string;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canUpload: boolean;
  };
  // ... existing props
}
```

- Hide "Add Session" button if `!permissions.canCreate`
- Hide "Upload" button if `!permissions.canUpload`  
- Hide Edit/Delete icons on sessions if `!permissions.canEdit/canDelete`
- Show read-only message for attendees: "The organizer manages this schedule"

#### 3b. GroupCalendar

**File**: `src/components/GroupCalendar.tsx`

**Current**: Uses `canPerformAction('calendar', 'can_edit_events')` from `useRolePermissions`
**Change**: Accept permissions prop for Events variant

- Hide "Add Event", "Import" buttons for attendees
- Hide Edit/Delete buttons on events for attendees
- Keep Export visible for all (read operation)

#### 3c. LineupTab

**File**: `src/components/events/LineupTab.tsx`

**Current**: Checks `userRole === 'organizer'`
**Change**: Accept permissions prop

```typescript
interface LineupTabProps {
  speakers: Speaker[];
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}
```

- Hide "Add to Line-up" button if `!permissions.canCreate`
- Hide edit/delete controls if `!permissions.canEdit/canDelete`

#### 3d. EventTasksTab

**File**: `src/components/events/EventTasksTab.tsx`

**Current**: Uses `isAdmin` prop
**Change**: Accept permissions prop

- Hide "Add Task" button if `!permissions.canCreate`
- Hide Edit/Delete buttons if `!permissions.canEdit/canDelete`
- Show message for attendees: "The organizer manages tasks for this event"

#### 3e. CommentsWall (Polls)

**File**: `src/components/CommentsWall.tsx`

**Change**: Accept permissions prop to control poll creation

```typescript
interface CommentsWallProps {
  tripId: string;
  permissions?: {
    canView: boolean;
    canVote: boolean;
    canCreate: boolean;
    canClose: boolean;
    canDelete: boolean;
  };
}
```

- Hide "Create Poll" button if `!permissions?.canCreate`
- Pass voting permissions to PollComponent
- Attendees can still vote on existing polls

#### 3f. PollComponent

**File**: `src/components/PollComponent.tsx`

**Change**: Accept permissions to control close/delete actions

- Pass `canClose` and `canDelete` to Poll component
- Hide close/delete buttons for attendees
- Keep voting enabled for all with `canVote`

#### 3g. UnifiedMediaHub

**File**: `src/components/UnifiedMediaHub.tsx`

**Change**: Accept permissions prop

```typescript
interface UnifiedMediaHubProps {
  tripId: string;
  permissions?: {
    canView: boolean;
    canUpload: boolean;
    canDeleteOwn: boolean;
    canDeleteAny: boolean;
  };
}
```

- Upload enabled for all (attendees encouraged to share photos)
- Delete own media enabled for all
- Delete any media (moderation) only for organizer/admin

---

## Permission Determination Logic

In `useEventPermissions`, determine organizer status by:

1. Check `trip_admins` table for explicit admin assignment
2. Check `trips.created_by === user.id` for trip creator
3. Check `trip_members.role === 'admin'` for legacy role assignment
4. Check `user_trip_roles` for 'Organizer' role assignment

```typescript
const isOrganizer = isAdmin || isCreator || hasOrganizerRole;

const eventPermissions: EventFeaturePermissions = {
  agenda: {
    canView: true,
    canCreate: isOrganizer,
    canEdit: isOrganizer,
    canDelete: isOrganizer,
    canUpload: isOrganizer
  },
  calendar: {
    canView: true,
    canCreate: isOrganizer,
    canEdit: isOrganizer,
    canDelete: isOrganizer
  },
  chat: {
    canView: true,
    canSend: true,
    canDeleteOwn: true,
    canDeleteAny: isOrganizer
  },
  media: {
    canView: true,
    canUpload: true,
    canDeleteOwn: true,
    canDeleteAny: isOrganizer
  },
  lineup: {
    canView: true,
    canCreate: isOrganizer,
    canEdit: isOrganizer,
    canDelete: isOrganizer
  },
  polls: {
    canView: true,
    canVote: true,
    canCreate: isOrganizer,
    canClose: isOrganizer,
    canDelete: isOrganizer
  },
  tasks: {
    canView: true,
    canCreate: isOrganizer,
    canEdit: isOrganizer,
    canDelete: isOrganizer
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useEventPermissions.ts` | Add `EventFeaturePermissions` interface, `isCreator` check, export permissions object |
| `src/components/events/EventDetailContent.tsx` | Pass granular permissions to each tab |
| `src/components/events/AgendaModal.tsx` | Accept permissions prop, hide admin controls for attendees |
| `src/components/GroupCalendar.tsx` | Accept permissions prop for Events variant |
| `src/components/events/EventTasksTab.tsx` | Accept permissions prop, hide admin controls |
| `src/components/events/LineupTab.tsx` | Accept permissions prop instead of userRole |
| `src/components/CommentsWall.tsx` | Accept permissions prop, conditionally show Create Poll |
| `src/components/PollComponent.tsx` | Accept permissions for close/delete visibility |
| `src/components/UnifiedMediaHub.tsx` | Accept permissions for delete-any moderation |
| `src/types/roleChannels.ts` | Add EventFeaturePermissions type |

---

## Demo Mode Behavior

When `isDemoMode === true`:
- All users get full organizer permissions
- This allows investors to see all features during demos

---

## Test Scenarios

1. **As Trip Creator** (authenticated, created the event):
   - Can see all admin buttons (Add Session, Add Task, Create Poll, etc.)
   - Can edit/delete any content

2. **As Attendee** (authenticated, joined via invite):
   - Agenda: View sessions only, no Add/Edit/Delete buttons
   - Calendar: View events only, no Add button
   - Chat: Full send/receive access
   - Media: Can upload, can delete own, cannot delete others'
   - Line-up: View only, no Add button
   - Polls: Can vote, cannot create/close/delete
   - Tasks: View only, no Add button

3. **In Demo Mode**:
   - Full organizer access regardless of actual role
