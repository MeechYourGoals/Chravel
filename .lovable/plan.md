
# Reorganize Polls Tab Layout

## Current Issue
The Polls tab has a centered layout with excessive empty space at the top. The feature badges (Group Decisions, Real-Time Results, Multiple Options) appear at the bottom, and everything is centered rather than using a row-based layout.

## Target Layout (Matching Tasks Tab Pattern)

```text
Row 1: [Group Polls]                              [+ Create Poll Button]
Row 2: [Description text]                         [Feature badges inline]
Row 3: [Empty state content OR poll list]
```

## Files to Modify

### 1. `src/components/CommentsWall.tsx`
**Current:** Renders "Group Polls" header separately from PollComponent
**Change:** Restructure to include the header in a flex row with the Create Poll button positioned to the right

### 2. `src/components/PollComponent.tsx`
**Current:** Renders empty state or full "Create Poll" button as separate centered elements
**Change:** 
- Move the "Create Poll" button to be passed up or handled at the container level
- When in empty state, render a simpler left-aligned message
- Pass `showCreatePoll` state and toggle handler as props or lift to parent

### 3. `src/components/polls/PollsEmptyState.tsx`
**Current Structure:**
```text
[Centered icon]
[Centered "No polls yet"]
[Centered description]
[Centered Create Poll button]
[Feature badges grid at bottom]
```

**New Structure:**
```text
Row 1: (handled by parent - header + button)
Row 2: [Description text, left-aligned]     [Feature badges, right-aligned, inline/row]
Row 3: [Simple "No polls yet" message, left-aligned, subtle]
```

## Detailed Changes

### CommentsWall.tsx
Change from:
```tsx
<h3>Group Polls</h3>
<PollComponent tripId={tripId} />
```

To:
```tsx
<div className="flex items-center justify-between mb-4">
  <h3>Group Polls</h3>
  <Button onClick={handleCreatePoll}>+ Create Poll</Button>
</div>
<div className="flex items-center justify-between mb-4">
  <p>Create polls to get everyone's input...</p>
  <div className="flex gap-2">[Feature badges inline]</div>
</div>
<PollComponent tripId={tripId} showCreateForm={showCreatePoll} ... />
```

### PollsEmptyState.tsx
Simplify to just show the subtle empty message without the button or feature badges (those move to parent):
```tsx
<div className="text-left py-4">
  <p className="text-gray-400 text-sm">No polls have been created yet.</p>
</div>
```

### PollComponent.tsx
- Accept props for whether create form should show (controlled by parent)
- Remove the "Create Poll" button from empty state (moved to header row)
- Simplify empty state rendering

## Visual Result

**Before:**
```
Group Polls
                    [big icon]
                   No polls yet
          Create polls to get everyone's...
                 [Create Poll]
    [Group Decisions] [Real-Time] [Multiple Options]
```

**After:**
```
Group Polls                           [+ Create Poll]
Create polls to get everyone's...   [Group Decisions] [Real-Time] [Multiple Options]
(subtle) No polls yet
- - - - - - - - - - - - - - - - - - - - - - - -
[Poll list appears here when polls exist]
```

## Technical Notes

- The layout follows the exact pattern used in `TripTasksTab.tsx` (lines 102-127)
- Feature badges become compact chips in a horizontal row on the right
- The empty state becomes minimal and left-aligned
- The Create Poll button position matches "Add Task" button positioning
- All existing functionality (create poll modal, poll list, voting) remains unchanged

## Alternative Approach
If we want to keep the components more self-contained, we could instead refactor only `PollsEmptyState.tsx` to have a horizontal layout with the button on the right, and move the feature badges to a horizontal row at the top. This requires fewer file changes but may not align as precisely with the Tasks pattern.
