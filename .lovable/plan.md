

# Consolidate Team Roster Admin Buttons

## Overview

Streamline the Team Roster admin action bar from 5 buttons to 3 by consolidating "Assign Roles" and "Admins" functionality into an enhanced "Manage Roles" dialog.

---

## Current State

```text
[Create Role] [Assign Roles] [Admins] [Requests] [Manage Roles]
```

## Target State

```text
[Create Roles] [Manage Roles] [Requests]
```

---

## Architecture Changes

### Enhanced Manage Roles Dialog

The new "Manage Roles" dialog will have tabs combining all role-related actions:

```text
┌────────────────────────────────────────────────────────────┐
│  Manage Roles                                              │
├────────────────────────────────────────────────────────────┤
│  [Roles] [Assign] [Admins]                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Roles Tab: Create, rename, delete roles, permissions      │
│  Assign Tab: Bulk role assignment to members               │
│  Admins Tab: Promote/demote trip administrators            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pro/team/RolesView.tsx` | Remove "Assign Roles" and "Admins" buttons; keep Create Role, Manage Roles, Requests |
| `src/components/pro/admin/RoleManagerDialog.tsx` | Add tabbed interface with 3 tabs: Roles, Assign, Admins |
| `src/components/pro/admin/RoleManager.tsx` | Refactor to be embeddable as a tab (already works) |

---

## Technical Implementation

### 1. Update RolesView.tsx (Button Bar)

**Remove buttons:**
- "Assign Roles" button (line 190-202)
- "Admins" button (line 203-214)

**Keep buttons (in this order):**
1. Create Role (line 178-189)
2. Manage Roles (line 227-238) - now opens enhanced dialog
3. Requests (line 215-226)

**Update grid for 3 buttons:**
```tsx
// Change from grid-cols-2 to proper 3-button layout
<div className={`${
  isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-center gap-2'
} mb-3`}>
```

### 2. Enhance RoleManagerDialog.tsx

**Add tabbed interface:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminManager } from './AdminManager';

// Inside dialog content:
<Tabs defaultValue="roles" className="w-full">
  <TabsList className="grid w-full grid-cols-3 rounded-full bg-white/5 p-1">
    <TabsTrigger value="roles" className="rounded-full">
      <Users className="w-4 h-4 mr-2" />
      Roles
    </TabsTrigger>
    <TabsTrigger value="assign" className="rounded-full">
      <UserPlus className="w-4 h-4 mr-2" />
      Assign
    </TabsTrigger>
    <TabsTrigger value="admins" className="rounded-full">
      <Shield className="w-4 h-4 mr-2" />
      Admins
    </TabsTrigger>
  </TabsList>

  <TabsContent value="roles">
    <RoleManager tripId={tripId} />
  </TabsContent>

  <TabsContent value="assign">
    <BulkRoleAssignmentPanel tripId={tripId} ... />
  </TabsContent>

  <TabsContent value="admins">
    <AdminManager tripId={tripId} tripCreatorId={tripCreatorId} />
  </TabsContent>
</Tabs>
```

### 3. Add Props to RoleManagerDialog

**New props needed:**
```tsx
interface RoleManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripCreatorId: string;  // NEW - needed for AdminManager
  roster: ProParticipant[];  // NEW - needed for Assign tab
  availableRoles: TripRole[];  // NEW - needed for Assign tab
  onUpdateMemberRole: (...) => Promise<void>;  // NEW - needed for Assign tab
}
```

### 4. Create Embedded Assignment Panel

**New component:** `src/components/pro/admin/RoleAssignPanel.tsx`

Extract the assignment logic from `BulkRoleAssignmentModal` into an embeddable panel without the modal wrapper, suitable for use as a tab.

---

## Mobile Optimization

The Sheet variant will use the same tabbed approach:
- Full-height bottom sheet (90vh)
- Scrollable tab content
- Large touch targets on tab triggers

---

## Button Order & Styling

| Button | Icon | Purpose |
|--------|------|---------|
| Create Roles | `UserPlus` | Opens CreateRoleDialog |
| Manage Roles | `Settings` or `Cog` | Opens enhanced tabbed dialog |
| Requests | `Clock` | Opens JoinRequestsDialog |

---

## Expected Result

**Before (5 buttons):**
```text
[Create Role] [Assign Roles] [Admins] [Requests] [Manage Roles]
```

**After (3 buttons):**
```text
[Create Roles] [Manage Roles] [Requests]
```

- "Manage Roles" now contains all role/admin management in organized tabs
- Cleaner UI with fewer buttons
- All functionality preserved and discoverable via tabs
- Logical grouping: role management actions live together

