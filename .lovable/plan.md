

## Visual Rebrand: CreateTripModal → Chravel Premium Design System

### Problem
The modal uses hardcoded `slate-*` and `blue-*` Tailwind classes throughout — creating a navy/blue SaaS look that clashes with Chravel's black/charcoal/gold system.

### Root Cause
Every styling token in `CreateTripModal.tsx` is inline blue:
- Container: `bg-slate-800 border-slate-700`
- Inputs: `bg-slate-700/50 border-slate-600 focus:border-blue-500`
- Toggle selected: `data-[state=on]:bg-blue-600`
- Create button: `bg-blue-600 hover:bg-blue-700`
- Labels: `text-slate-300`, helpers: `text-slate-400`
- Upload zone: `border-slate-600 bg-slate-700/30`

This is a single-file fix — all 736 lines are in `src/components/CreateTripModal.tsx`.

### Changes (all in `CreateTripModal.tsx`)

**Modal shell** (line 356):
- `bg-slate-800 border-slate-700` → `bg-[#1a1a1a] border-[#333]` (deep charcoal, warm gray border)

**Close button** (line 363):
- `text-slate-400 hover:text-white` → `text-gray-500 hover:text-white`

**Labels** (~10 instances):
- `text-slate-300` → `text-gray-300`

**Helper text** (~6 instances):
- `text-slate-400` → `text-gray-500`

**All inputs, textareas, selects** (~8 fields):
- `bg-slate-700/50 border-slate-600` → `bg-[#222]/60 border-[#444]`
- `focus:border-blue-500` → `focus:border-[#c49746]` (gold focus ring)
- `placeholder-slate-400` → `placeholder-gray-500`

**Trip Type segmented control** (lines 377–400):
- Container: `bg-slate-700/30` → `bg-[#222]/50`
- Selected state: `data-[state=on]:bg-blue-600 data-[state=on]:text-white` → `data-[state=on]:bg-gradient-to-r data-[state=on]:from-[#533517] data-[state=on]:to-[#c49746] data-[state=on]:text-white` (gold gradient pill)
- Unselected: `text-slate-300` → `text-gray-400 hover:text-gray-200`

**Create button** (line 727):
- `bg-blue-600 hover:bg-blue-700` → `bg-gradient-to-r from-[#533517] to-[#c49746] hover:from-[#6a441e] hover:to-[#d4a74f]` (premium gold CTA)

**Cancel button** (line 720):
- `bg-slate-700 hover:bg-slate-600` → `bg-[#2a2a2a] hover:bg-[#333] border border-[#444]`

**Upload zone** (line 610):
- `border-slate-600 bg-slate-700/30 hover:bg-slate-700/50` → `border-[#444] bg-[#222]/40 hover:bg-[#2a2a2a]`
- Upload icon/text: `text-slate-400` → `text-gray-500`

**Advanced settings collapsible** (lines 674, 685):
- `bg-slate-700/30 hover:bg-slate-700/50` → `bg-[#222]/40 hover:bg-[#2a2a2a]`
- `bg-slate-700/20` → `bg-[#1e1e1e]`

**Color picker ring offset** (line 699):
- `ring-offset-slate-800` → `ring-offset-[#1a1a1a]`

**Cover preview border** (line 624):
- `border-slate-600` → `border-[#444]`

### What stays unchanged
- Layout, spacing, structure, form logic, validation, submission flow
- Typography sizing and weights
- Error states (red) — kept as-is for clarity
- All functionality, accessibility, responsiveness

