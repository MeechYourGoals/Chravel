# Team Tab Refactor Plan - Role-Based Channels & Consistency

## Executive Summary
Refactoring the Team tab in Pro trips to provide clear separation between **Channels** (communication) and **Roles** (team management), fixing scrolling issues, and ensuring consistency across all Pro trip types.

---

## Problem Analysis

### Issue 1: Inconsistent Channel Visibility
- **Beyoncé Tour**: Role-based channels only appear when clicking "Tour Manager" filter
- **Eli C-Suite Retreat**: Channels show at bottom but can't scroll down to see them
- **Lakers Trip**: Same scrolling issue, channels hidden until specific filter clicked

### Issue 2: Scrolling/Overflow Problems
**Root Cause**: Container height constraints in component hierarchy:

```tsx
// ProTabContent.tsx - Line 172
<div className="h-[calc(100vh-320px)] max-h-[1000px] min-h-[500px] overflow-hidden flex flex-col">
```

**Impact**:
- `overflow-hidden` prevents scrolling within tab content
- Role-based channels rendered at bottom of TeamTab (line 261-271) get cut off
- No way to scroll down to see channels when team roster is long

### Issue 3: Poor Information Architecture
- Channels buried at bottom after team member cards
- No clear separation between "view team" vs "access channels"
- Role filters mixed with team member display
- Admin role management not clearly separated from communication

---

## Solution Architecture

### New Team Tab Structure

```
┌─────────────────────────────────────────────┐
│           TEAM TAB HEADER                    │
│  [Channels Tab]  [Roles Tab]                │  ← NEW: Sub-tab navigation
└─────────────────────────────────────────────┘
```

#### **CHANNELS TAB (Default View)**
```
┌─────────────────────────────────────────────┐
│  🔒 Role-Based Channels                     │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ #production  │  │ #security    │        │
│  │ 25 members   │  │ 20 members   │        │
│  │ 3 unread     │  │ 1 unread     │        │
│  └──────────────┘  └──────────────┘        │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ #medical     │  │ #vip         │        │
│  │ 5 members    │  │ 8 members    │        │
│  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────┘
```

**Features**:
- Grid display of all accessible role-based channels
- Click to open channel chat inline
- Shows unread counts, member counts
- Prominent, always visible
- No scrolling needed to discover channels

#### **ROLES TAB (Admin View)**
```
┌─────────────────────────────────────────────┐
│  Team Roster - 57 members                   │
│  [Bulk Edit] [Assign Roles] [Export]        │
│                                              │
│  Role Filters:                               │
│  [All Roles] [Artist Team] [Crew] [VIP]    │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 👤 Tour Director                       │ │
│  │    director@tourmanagement.com         │ │
│  │    📍 Tour Manager          [Edit]     │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Admin Controls:                             │
│  ┌────────────────────────────────────────┐ │
│  │ Create New Role                        │ │
│  │ [Input field] [Create]                 │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Features**:
- Full team roster with role badges
- Role filter pills (existing functionality)
- Admin: Create custom roles with input field
- Admin: Assign roles to members
- Bulk operations (existing functionality)

---

## Technical Implementation

### 1. Fix Scrolling Issue

**File**: `src/components/pro/ProTabContent.tsx`

**Change**:
```tsx
// BEFORE (Line 172):
<div className="h-[calc(100vh-320px)] max-h-[1000px] min-h-[500px] overflow-hidden flex flex-col">

// AFTER:
<div className="h-[calc(100vh-320px)] max-h-[1000px] min-h-[500px] overflow-y-auto flex flex-col">
```

**Rationale**: Change `overflow-hidden` to `overflow-y-auto` to enable vertical scrolling within tab content.

### 2. Refactor TeamTab Component

**File**: `src/components/pro/TeamTab.tsx`

**New Structure**:
```tsx
export const TeamTab = ({ roster, userRole, isReadOnly, category, tripId, onUpdateMemberRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'channels' | 'roles'>('channels'); // Default to channels
  
  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-gray-700">
        <button 
          onClick={() => setActiveSubTab('channels')}
          className={/* active styles */}
        >
          <MessageSquare size={16} />
          Channels
        </button>
        <button 
          onClick={() => setActiveSubTab('roles')}
          className={/* active styles */}
        >
          <Users size={16} />
          Roles
        </button>
      </div>
      
      {/* Conditional Rendering */}
      {activeSubTab === 'channels' ? (
        <ChannelsView tripId={tripId} userRole={userRole} />
      ) : (
        <RolesView 
          roster={roster}
          userRole={userRole}
          isReadOnly={isReadOnly}
          category={category}
          onUpdateMemberRole={onUpdateMemberRole}
        />
      )}
    </div>
  );
};
```

### 3. Create New Components

**File**: `src/components/pro/team/ChannelsView.tsx`
- Uses existing `InlineChannelList` component
- Shows all role-based channels in grid
- Click to expand channel chat inline

**File**: `src/components/pro/team/RolesView.tsx`
- Moves existing roster grid display here
- Includes role filter pills
- Includes bulk edit, assign roles buttons
- Includes admin role creation input

---

## Implementation Steps

### Phase 1: Fix Scrolling (Priority 1)
- [ ] Update `ProTabContent.tsx` overflow property
- [ ] Test scrolling on all Pro trip types
- [ ] Verify role-based channels now visible

### Phase 2: Refactor TeamTab (Priority 1)
- [ ] Add sub-tab navigation state to `TeamTab.tsx`
- [ ] Create sub-tab UI with Channels/Roles buttons
- [ ] Extract roster display to separate component

### Phase 3: Create New Components (Priority 2)
- [ ] Create `ChannelsView.tsx` component
- [ ] Create `RolesView.tsx` component
- [ ] Move role filter logic to RolesView
- [ ] Move admin controls to RolesView

### Phase 4: Admin Role Creation (Priority 2)
- [ ] Add input field in RolesView for admins
- [ ] Implement role creation logic
- [ ] Add dropdown to assign new roles to members
- [ ] Update existing role management modals

### Phase 5: Testing & Consistency (Priority 1)
- [ ] Test Beyoncé Tour mock trip
- [ ] Test Eli C-Suite Retreat mock trip
- [ ] Test Lakers Trip mock trip
- [ ] Verify consistency across all Pro trip types
- [ ] Test mobile responsiveness

### Phase 6: Documentation (Priority 3)
- [ ] Update `DEVELOPER_HANDBOOK.md`
- [ ] Update iOS transition docs
- [ ] Add screenshots to documentation

---

## Success Criteria

### Functional
- ✅ Channels visible by default on Team tab
- ✅ No scrolling needed to discover channels
- ✅ Roles tab shows full team roster with admin controls
- ✅ Admins can create custom roles via input field
- ✅ Consistent behavior across all Pro trip types

### Technical
- ✅ No overflow/scrolling issues
- ✅ Clean separation of concerns (channels vs roles)
- ✅ Maintains existing functionality (bulk edit, role filters)
- ✅ Mobile responsive

### UX
- ✅ Clear information hierarchy
- ✅ Intuitive navigation between channels and roles
- ✅ Reduced clicks to access channels
- ✅ Admin workflows are clear and discoverable

---

## Rollback Plan

If issues arise:
1. Revert `ProTabContent.tsx` overflow change
2. Revert `TeamTab.tsx` to single-view structure
3. Keep channels inline at bottom (original behavior)

---

## Notes

- Existing `InlineChannelList` component can be reused
- Existing role management modals remain functional
- No database schema changes required
- Demo data already supports this structure
