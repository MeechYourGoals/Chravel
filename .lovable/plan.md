

# MVP Simplification: Remove Permissions, Consolidate Role Management

## Overview

Drastically simplify the role system for MVP. **Roles exist purely to control which channels a user can access in chat** - not to grant pseudo-admin permissions over trip features. The permissions editor and Admin tab will be removed entirely.

---

## Core Principle

> **"Roles = Channel Access"**
> 
> A role determines which channels a user can see and participate in. That's it. All trip-level admin functions (managing roles, managing the trip) are handled by Trip Admins, not role permissions.

---

## Changes Summary

| Item | Current State | Target State |
|------|---------------|--------------|
| Manage Roles tabs | 3 tabs (Roles, Assign, Admins) | 2 tabs (Roles, Assign) |
| Permissions Editor | 22+ toggles across 5 categories | **REMOVED entirely** |
| Admin management | Separate "Admins" tab | Inline toggle in Assign tab |
| Permission Level dropdown | View/Edit/Admin on role creation | **REMOVED** |
| Permissions button per role | Opens PermissionEditorDialog | **REMOVED** |
| Role card buttons | 4 buttons (Rename, Members, Permissions, Delete) | 3 buttons (Rename, Members, Delete) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pro/admin/RoleManagerDialog.tsx` | Remove Admins tab, reduce to 2 tabs |
| `src/components/pro/admin/RoleManager.tsx` | Remove Permissions button, remove permission level dropdown, fix button overflow |
| `src/components/pro/admin/RoleAssignmentPanel.tsx` | Add inline "Make Admin" toggle per user |
| `src/components/pro/admin/PermissionEditorDialog.tsx` | **DELETE this file** |
| `src/types/roleChannels.ts` | Remove `FeaturePermissions` interface (optional, can keep for future) |

---

## Technical Implementation

### 1. RoleManagerDialog.tsx - Reduce to 2 Tabs

```tsx
// FROM: 3 tabs
<TabsList className="grid w-full grid-cols-3 ...">
  <TabsTrigger value="roles">Roles</TabsTrigger>
  <TabsTrigger value="assign">Assign</TabsTrigger>
  <TabsTrigger value="admins">Admins</TabsTrigger>  // REMOVE
</TabsList>

// TO: 2 tabs
<TabsList className="grid w-full grid-cols-2 ...">
  <TabsTrigger value="roles">Roles</TabsTrigger>
  <TabsTrigger value="assign">Assign</TabsTrigger>
</TabsList>
```

- Remove the AdminManager import
- Remove the Admins TabContent
- Update description to "Manage roles and assign members to channels"

### 2. RoleManager.tsx - Remove Permissions UI

**Remove from Create Role Dialog:**
- Remove the "Permission Level" dropdown (lines 395-410)
- Remove the `permissionLevel` state and usage
- Simplify `createRole()` call to just pass role name

**Remove from Role Cards:**
- Remove the "Permissions" button (lines 334-345)
- Remove `showPermissionEditor` state
- Remove `PermissionEditorDialog` import and component
- Remove `handleSavePermissions` function

**Fix Button Overflow (button layout for role cards):**
```tsx
// Current: buttons overflow on narrow cards
<div className="flex items-center gap-2">
  {/* 4 buttons in a row - overflows */}
</div>

// Fixed: flex-wrap and smaller sizing
<div className="flex items-center gap-1.5 flex-wrap justify-end min-w-0">
  <Button size="icon" className="h-8 w-8 rounded-full shrink-0">
    <Pencil className="w-3.5 h-3.5" />
  </Button>
  <Button size="sm" className="h-8 px-2 rounded-full shrink-0">
    <UserMinus className="w-3.5 h-3.5 mr-1" />
    <span className="hidden sm:inline">Members</span>
  </Button>
  <Button size="icon" className="h-8 w-8 rounded-full shrink-0">
    <Trash2 className="w-3.5 h-3.5" />
  </Button>
</div>
```

### 3. RoleAssignmentPanel.tsx - Add Inline Admin Toggle

Each user row gets a "Make Admin" button:

```tsx
<div className="flex items-center gap-2">
  {/* Role selector */}
  <Select ... />
  
  {/* NEW: Admin toggle button */}
  <Button
    size="sm"
    variant={isUserAdmin ? "default" : "outline"}
    onClick={() => toggleAdminStatus(userId)}
    className={cn(
      "rounded-full h-8 px-3 shrink-0",
      isUserAdmin 
        ? "bg-blue-600 hover:bg-blue-700 text-white" 
        : "border-white/20 hover:bg-blue-500/10"
    )}
    title={isUserAdmin ? "Remove admin privileges" : "Make admin"}
  >
    <Shield className="w-3.5 h-3.5" />
    {isUserAdmin && <span className="ml-1 text-xs">Admin</span>}
  </Button>
  
  {/* Assign button */}
  {selectedRoles[userId] && (
    <Button size="sm" className="rounded-full bg-green-600">
      Assign
    </Button>
  )}
  
  {/* Remove button */}
  <Button size="sm" variant="outline" className="rounded-full">
    <X className="w-3.5 h-3.5" />
  </Button>
</div>
```

This requires:
- Import `useTripAdmins` hook
- Track which users are admins via the hook
- Add `toggleAdminStatus()` function that calls `promoteToAdmin` or `demoteFromAdmin`

### 4. Delete PermissionEditorDialog.tsx

This file will be deleted entirely as permissions are being removed from the MVP.

---

## User Flow After Changes

**Creating a Role:**
1. Click "Create Role"
2. Enter role name (e.g., "Coaches")
3. A channel is automatically created for that role
4. Done - no permissions to configure

**Assigning a Role:**
1. Open "Manage Roles" → "Assign" tab
2. Select a member and choose their role
3. Optionally click the Shield icon to make them a Trip Admin
4. Click Assign

**What Each Role Gets:**
- Access to the role's private channel
- All standard trip features (calendar, media, tasks, payments)
- If marked as Admin: access to admin functions (manage roles, channels, settings)

---

## Visual Result

**Before (Role Card):**
```text
┌─────────────────────────────────────────────────────────┐
│ Coaches                     [Edit] [✓3] [Perms] [🗑]    │
│ edit • 3 members • #coaches                             │
└─────────────────────────────────────────────────────────┘
```

**After (Role Card):**
```text
┌─────────────────────────────────────────────────────────┐
│ Coaches                           [Edit] [Members] [🗑] │
│ 3 members • #coaches                                    │
└─────────────────────────────────────────────────────────┘
```

**Assign Tab User Row (After):**
```text
┌─────────────────────────────────────────────────────────┐
│ [Avatar] John Smith   [Coaches ▼] [🛡 Admin] [Assign] [✕]│
└─────────────────────────────────────────────────────────┘
```

---

## Why This is Better for MVP

1. **Simpler mental model**: Role = Channel Access. Admin = Trip Management.
2. **Faster onboarding**: No complex permission matrix to configure
3. **Less confusion**: Users don't need to understand 22 permission toggles
4. **Clear separation**: Trip admins handle management, roles handle channel access
5. **Extensible**: We can add feature permissions back post-MVP if needed

---

## Files Summary

| Action | File |
|--------|------|
| MODIFY | `src/components/pro/admin/RoleManagerDialog.tsx` |
| MODIFY | `src/components/pro/admin/RoleManager.tsx` |
| MODIFY | `src/components/pro/admin/RoleAssignmentPanel.tsx` |
| DELETE | `src/components/pro/admin/PermissionEditorDialog.tsx` |
| MODIFY | `src/hooks/useTripRoles.ts` (remove permission_level handling if passed) |

