
## Trim Concierge Empty State (Keep Green Badge)

**File:** `src/components/AIConciergeChat.tsx` — lines 1817–1848

**Three changes only:**

1. **Remove** the `<h4>Your Travel Concierge</h4>` block (lines 1819–1821)
2. **Delete** the last 3 bullets (lines 1834–1841): flights, tasks, hotel screenshot — keep only the first 4
3. **Keep** the green badge (lines 1843–1845) as-is

The `messages.length === 0 && !isHistoryLoading` guard already handles hiding everything on first message — no logic change needed.

**Result:**
```
Try asking:
• "Find 5 great hotels near our base camp..."
• "What's on our calendar for the rest of the trip?"
• "Add a dinner reservation..."
• "Create a poll: Saturday night plans..."
[green badge: I can search, show rich cards, and write directly to your trip]
```
