

# Consolidate Agenda Layout: Remove Wasted Whitespace

## Problem

On desktop, the Agenda tab has excessive vertical whitespace:
- "Schedule" sits alone on its own row beneath Import Agenda / Add Session buttons
- "Agenda File" sits alone on its own row beneath the Upload button
- Both have empty space above and below them before their content cards appear

## Solution

Move "Schedule" and "Agenda Files" labels up into the action button row using the existing 7-column event parity grid, and remove the separate header rows entirely. This eliminates two full rows of whitespace.

## Technical Changes

### File: `src/components/events/AgendaModal.tsx`

**1. Add section labels into the action button row (lines 221-281):**
- Add "Schedule" text (with Clock icon) into the parity grid at `EVENT_PARITY_COL_START.agenda` (col 1) -- centered under the Agenda tab
- Add "Agenda Files" text (with FileText icon, pluralized) into the parity grid at `EVENT_PARITY_COL_START.lineup` (col 5) -- centered under the Line-up tab
- These labels sit in the same row as Import Agenda, Add Session, and Upload buttons

**2. Remove the standalone header rows from each split panel:**
- Remove lines 288-293 (the "Schedule" header `<div>` inside the left panel)
- Remove lines 577-582 (the "Agenda File" header `<div>` inside the right panel)

**3. Rename "Agenda File" to "Agenda Files" (plural):**
- Update the label text and the empty-state heading from "No Agenda File" to "No Agenda Files"
- Update description text to reflect that multiple files can be uploaded

**4. Reduce top padding on the split panels:**
- Since the headers are gone, reduce the `p-4` top padding on each panel to `pt-2 px-4 pb-4` so content cards shift up into the freed space

## Result Layout (Desktop)

```text
Row 1: [Agenda] [Calendar] [Chat] [Media] [Line-up] [Polls] [Tasks]   <-- tabs
Row 2: [Schedule] [Import Agenda] [Add Session] [      ] [Agenda Files] [    ] [Upload]
Row 3: [---- No Sessions Yet card ----] [---- No Agenda Files card ----]
```

The two empty-state cards shift up by roughly 80px, creating a much tighter, cleaner layout with no wasted vertical space.
