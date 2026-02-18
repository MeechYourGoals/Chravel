
# Fix: Constrain AI Concierge to Fixed Container Height (Match Chat Window)

## Problem

The AI Concierge window grows vertically with long responses instead of maintaining a fixed height with internal scrolling. This happens because:

1. The parent tab content container in `TripTabs.tsx` (line 290) uses `overflow-y-auto` -- allowing child content to expand the container and scroll externally
2. The Concierge component uses `flex-1` to fill available space, but the parent has no fixed height constraint on mobile (`h-auto max-h-none`)
3. On desktop, the parent has `md:h-[calc(100vh-240px)]` but the concierge's messages div has `min-h-[280px]` which can push content beyond bounds

The Chat tab works correctly because its `VirtualizedMessageContainer` has built-in scroll containment. The Concierge just uses a plain `overflow-y-auto` div that grows with content.

## Solution

Two targeted changes to ensure the Concierge window always stays within its container and scrolls internally, exactly like the Chat window:

### 1. `src/components/AIConciergeChat.tsx` -- Add explicit height constraint

The outer wrapper (line 667) currently uses `flex-1 min-h-0` which relies on a properly constrained parent. Add an explicit max-height so it never grows beyond the viewport regardless of parent constraints:

```
// Line 667 - Change from:
<div className="flex flex-col px-0 py-4 overflow-hidden flex-1 min-h-0">

// To:
<div className="flex flex-col px-0 py-4 overflow-hidden flex-1 min-h-0 h-full max-h-[calc(100vh-240px)]">
```

This mirrors the desktop constraint from the parent container but applies it directly to the concierge, ensuring it works regardless of what the parent does.

### 2. `src/components/AIConciergeChat.tsx` -- Remove min-height on messages area

The messages container (line 743) has `min-h-[280px]` which can force the container to exceed bounds when combined with the header, empty state, and input:

```
// Line 743 - Change from:
<div className="flex-1 overflow-y-auto p-4 chat-scroll-container native-scroll min-h-[280px]">

// To:
<div className="flex-1 overflow-y-auto p-4 chat-scroll-container native-scroll min-h-0">
```

Using `min-h-0` instead of `min-h-[280px]` allows the flex child to shrink properly within the fixed container. The `flex-1` still ensures it takes all available space.

### 3. `src/components/TripTabs.tsx` -- Ensure desktop height applies to concierge tab

The tab content wrapper (line 290) uses `h-auto` on mobile and `md:h-[calc(100vh-240px)]` on desktop. The concierge tab child needs `h-full` (line 307 already sets this for active tabs), so the desktop constraint should propagate correctly once the concierge component respects it with `min-h-0`.

No change needed here -- the existing `h-full` class on the active tab div is sufficient once the concierge component properly constrains itself.

## Result

- Concierge window stays the exact same size as the Chat window
- Long AI responses scroll within the fixed container
- Consistent behavior across desktop, tablet, and mobile
- No visual expansion or "pushing down" of the window
