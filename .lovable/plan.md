# Consolidate Team Roster Admin Buttons

## Status: ✅ COMPLETE

## Overview

Streamlined the Team Roster admin action bar from 5 buttons to 3 by consolidating "Assign Roles" and "Admins" functionality into an enhanced "Manage Roles" dialog.

---

## Before (5 buttons)

```text
[Create Role] [Assign Roles] [Admins] [Requests] [Manage Roles]
```

## After (3 buttons)

```text
[Create Roles] [Manage Roles] [Requests]
```

---

## Changes Made

### 1. RolesView.tsx
- Removed "Assign Roles" and "Admins" buttons
- Updated layout from grid-cols-2 to flex for 3 buttons
- Removed unused imports (AdminManagerDialog, UsersRound, Shield)
- Removed unused state (showAdminsDialog)
- Updated RoleManagerDialog props to pass tripCreatorId, roster, availableRoles, onUpdateMemberRole

### 2. RoleManagerDialog.tsx (Enhanced)
- Added tabbed interface with 3 tabs:
  - **Roles**: Existing RoleManager for permissions and role definitions
  - **Assign**: RoleAssignmentPanel for bulk member assignments
  - **Admins**: AdminManager for promoting/demoting trip administrators
- Updated props to include tripCreatorId, roster, availableRoles, onUpdateMemberRole
- Mobile-optimized with Sheet variant at 90vh height
- Responsive tab triggers with icons and labels

---

## Result

- "Manage Roles" now contains all role/admin management in organized tabs
- Cleaner UI with fewer buttons (5 → 3)
- All functionality preserved and discoverable via tabs
- Logical grouping: role management actions live together
