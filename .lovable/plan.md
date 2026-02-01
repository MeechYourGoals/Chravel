
# Event Card Button Styling Fix

## Summary

Update Event cards so the **View Event** button is highlighted with a golden shadow effect (matching Pro trip pattern), while the **Invite** button uses the card's native color scheme (not gold).

---

## Current vs Desired State

| Button | Current (Events) | Desired (Events) | Reference |
|--------|------------------|------------------|-----------|
| **View Event** | Neutral (`bg-white/10`) | Card color + golden shadow | Pro trips pattern |
| **Invite** | Gold gradient | Card color (neutral) | Pro trips pattern |

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/components/EventCard.tsx` | Desktop event card buttons |
| `src/components/MobileEventCard.tsx` | Mobile event card buttons |

---

## Technical Changes

### EventCard.tsx (Desktop)

**Lines 264-276** - Swap the button styles:

**View Event button** (currently neutral → add golden shadow):
```tsx
// FROM:
className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-medium py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-200 text-xs md:text-sm"

// TO:
className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-300 text-xs md:text-sm border border-white/10 shadow-lg shadow-yellow-500/25"
```

**Invite button** (currently gold → neutral like card):
```tsx
// FROM:
className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white font-semibold py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-300 shadow-lg hover:shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm`}

// TO:
className="bg-black/30 hover:bg-black/40 text-white py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-xs md:text-sm flex items-center justify-center gap-2"
```

---

### MobileEventCard.tsx (Mobile)

**Lines 259-273** - Same pattern swap:

**View Event button** (add golden shadow):
```tsx
// FROM:
className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-300 text-sm"

// TO:
className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-300 text-sm border border-white/10 shadow-lg shadow-yellow-500/25"
```

**Invite button** (remove gold, use neutral):
```tsx
// FROM:
className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm`}

// TO:
className="bg-black/30 hover:bg-black/40 text-white py-3 rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-sm flex items-center justify-center gap-2"
```

---

## Visual Result

After this change, Event cards will match the Pro trip pattern:
- **View Event**: Same color as card background + subtle golden glow/shadow
- **Invite**: Neutral dark style matching Recap/Share buttons
- **Consistency**: All three card types now follow the same principle where "View" is the highlighted action

---

## Button Styling Reference

| Trip Type | View Button | Effect |
|-----------|-------------|--------|
| Regular (My Trips) | Full gold gradient | High contrast gold |
| Pro | Card color + golden shadow | Subtle golden glow |
| Events | Card color + golden shadow | Subtle golden glow (after fix) |
