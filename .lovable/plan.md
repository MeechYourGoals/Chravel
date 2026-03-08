

## What's Wrong

1. **Action buttons (Recap, Invite, View, Share)** — use `border-gray-700 hover:border-gray-600` with no gold accent. User wants the same gold border treatment as the card itself (`border-gold-primary/30`).

2. **Title hover color** — uses `group-hover:text-gold-light` which resolves to `#feeaa5` (pale champagne yellow). Should use `group-hover:text-gold-mid` (`#e8af48`, warm glow gold) or `group-hover:text-gold-primary` (`#c49746`) for a richer gold.

3. **MapPin/Calendar icons** — already use `text-gold-primary` (`#c49746`). This is actually the correct new palette color. However, looking at the screenshot, they still appear yellowish — this may be because the CSS variable `--primary` is still resolving to the old gold. Need to verify `index.css` has the updated `--primary` value.

## Changes

### 1. `src/components/TripCard.tsx`

**Action buttons (lines 513-546):** Change `border-gray-700 hover:border-gray-600` to `border-gold-primary/30 hover:border-gold-primary/50` on all four buttons (Recap, Invite, View, Share).

**Title hover (line 404):** Change `group-hover:text-gold-light` to `group-hover:text-gold-mid` for a warmer, richer gold hover instead of pale champagne.

### 2. Verify `src/index.css`

Confirm the `--primary` HSL value maps to the new `#c49746` (approximately `hsl(35, 50%, 52%)`). If it still has the old yellow gold value, update it.

