

# Remove Redundant Empty State Buttons in Line-up and Tasks Tabs

## Problem

On mobile event views, both the Line-up and Tasks tabs show two action buttons that do the same thing:
- **Line-up**: "Add to Line-up" in the header + "Add First Member" in the empty state
- **Tasks**: "Add Task" in the header + "Add First Task" in the empty state

The lower buttons are redundant since the header buttons are always visible.

## Changes

### 1. `src/components/events/LineupTab.tsx` (lines 281-289)

Remove the "Add First Member" button from the empty state. Keep the icon, heading, and description text -- just remove the `{canCreate && (<Button>...</Button>)}` block.

### 2. `src/components/events/EventTasksTab.tsx` (lines 254-262)

Remove the "Add First Task" button from the empty state. Same approach -- keep the empty state card with its icon, heading, and description, but remove the button block.

Both empty states will still clearly communicate that no items exist and what they're for, while the header buttons remain the single point of action.

