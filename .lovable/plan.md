
# Mobile Layout Fix: Role Management Dialog

## Problem Summary

The Role Management dialog has several mobile layout issues visible in the screenshot:

1. **Header Overflow**: "Create Role" button is cut off on the right side
2. **Role Cards**: Role names and channel hashtags overlap with action buttons
3. **Inconsistent Layout**: Some role names appear under buttons, others overlap

---

## Solution: Stack-Based Mobile Layout

### Change 1: Restructure the Header Section

**Current Layout** (broken):
```
[Icon] [Role Management] [4/10]  ←→  [+ Create Role]
```

**Proposed Layout** (mobile-optimized):
```
[Icon] Role Management
       [4/10 roles]   [+ Create]
```

- Stack the header title on top
- Place the counter and button on a second row, centered
- Make the "Create" button more compact (icon only on very small screens)

### Change 2: Vertical Stack for Role Cards

**Current Layout** (broken):
```
[Co-Founder team]  [✏️] [👥] [🗑️]
[1 members • #Co-Founder team]
```
Text and buttons compete for horizontal space, causing overlap.

**Proposed Layout** (mobile-optimized):
```
[Co-Founder team]
[1 members • #Co-Founder team]
──────────────────────────────
   [✏️]    [👥]    [🗑️]
```

- Role info stacked at top (full width)
- Action buttons in their own row at bottom (centered)
- Clear visual separation

---

## Technical Implementation

### File: `src/components/pro/admin/RoleManager.tsx`

#### Header Section (Lines 303-321)

Replace the single-row flex layout with a two-row stacked layout for mobile:

```tsx
{/* Header - Stacked on mobile */}
<div className="mb-6">
  {/* Title Row */}
  <div className="flex items-center gap-2 mb-3">
    <Users className="w-5 h-5 text-purple-500" />
    <h3 className="font-semibold text-foreground">Role Management</h3>
  </div>
  
  {/* Actions Row - Centered */}
  <div className="flex items-center justify-center gap-3">
    <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full">
      {roles.length} / {MAX_ROLES_PER_TRIP}
    </span>
    <Button
      onClick={() => setShowCreateDialog(true)}
      disabled={roles.length >= MAX_ROLES_PER_TRIP}
      className="rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3"
      size="sm"
    >
      <Plus className="w-3.5 h-3.5 mr-1" />
      Create
    </Button>
  </div>
</div>
```

#### Role Card Layout (Lines 344-399)

Change from horizontal flex to vertical stack:

```tsx
<div
  key={role.id}
  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
>
  {/* Role Info - Full Width */}
  <div className="mb-3">
    <h4 className="font-medium text-foreground mb-1">{role.roleName}</h4>
    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
      <span>{role.memberCount || 0} members</span>
      {hasChannel && !(channel as any).is_archived && (
        <>
          <span>•</span>
          <div className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            <span>#{(channel as any).channel_name}</span>
          </div>
        </>
      )}
    </div>
  </div>

  {/* Action Buttons - Centered Row */}
  <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5">
    <Button variant="outline" size="icon" ...>
      <Pencil className="w-4 h-4" />
    </Button>
    <Button variant="outline" size="icon" ...>
      <UserMinus className="w-4 h-4" />
    </Button>
    <Button variant="outline" size="icon" ...>
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
</div>
```

---

## Visual Summary

### Before (Broken)
```
┌─────────────────────────────────────┐
│ 👥 Role Management [4/10] [+ Create R│  ← cut off
├─────────────────────────────────────┤
│ Co-                                 │
│ Founder   [✏️][👥][🗑️]              │  ← text overlaps
│ team                                │
│ 1 members • #Co-Founder team        │  ← runs into icons
└─────────────────────────────────────┘
```

### After (Fixed)
```
┌─────────────────────────────────────┐
│ 👥 Role Management                  │
│        [4/10]  [+ Create]           │  ← centered row
├─────────────────────────────────────┤
│ Co-Founder team                     │
│ 1 members • #Co-Founder team        │  ← clear space
│ ─────────────────────────────────── │
│      [✏️]    [👥]    [🗑️]           │  ← buttons below
└─────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pro/admin/RoleManager.tsx` | Restructure header (lines 303-321) and role cards (lines 344-399) |

---

## Scope

- Header restructure: ~15 lines changed
- Role card restructure: ~30 lines changed
- No new dependencies
- No database changes
- Mobile/PWA optimized while desktop remains functional
