

## Gold Consistency Overhaul — Metallic Gradient Everywhere

### Problem

The Concierge tab's `accent-ring-active` class is the gold standard (literally) — it uses the metallic gradient border (`#533517 → #c49746 → #feeaa5 → #c49746`). But almost everything else uses either:
- **Flat `border-gold-primary`** (HSL mustard) for spinners, borders, icons
- **Filled crimson/blue gradients** for Pro/Event tab selections instead of the gold ring

The user wants ONE gold language site-wide: the metallic gradient ring.

---

### Changes (grouped by category)

#### 1. Pro & Event Tabs → Use `accent-ring-active` / `accent-ring-idle`

Consumer `TripTabs.tsx` already uses `accent-ring-active`. Pro/Event tabs use filled color gradients instead.

**Files:**
- `src/components/pro/ProTabNavigation.tsx` (line 53-56) — Replace `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md` with `accent-ring-active text-white` for active, and `accent-ring-idle text-gray-300 hover:text-white` for idle.
- `src/components/events/EventDetailContent.tsx` (line 208-211) — Same replacement.
- `src/components/mobile/MobileTripTabs.tsx` (line 529-536) — Same replacement: active uses `accent-ring-active text-white shadow-lg`, idle uses `accent-ring-idle text-gray-300`.

#### 2. Loading Spinners → Gradient Ring

All spinners currently use `border-gold-primary/30 border-t-gold-primary` (flat). Add a new CSS utility class `.gold-gradient-spinner` that uses a conic gradient of the metallic palette.

**File: `src/index.css`** — Add:
```css
.gold-gradient-spinner {
  border: 2px solid rgba(196, 151, 70, 0.15);
  border-top-color: transparent;
  background: conic-gradient(from 0deg, transparent 0%, #c49746 40%, #feeaa5 70%, #c49746 100%) border-box;
  /* Fallback: use mask for the ring effect */
}
```

Actually, the cleanest approach for spinners: use a conic-gradient ring with mask. New CSS class:

```css
.gold-gradient-spinner {
  border: 2.5px solid transparent;
  border-radius: 9999px;
  background: 
    conic-gradient(from 180deg, transparent 0%, #533517 20%, #c49746 50%, #feeaa5 75%, transparent 100%) border-box;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
}
```

**Files to update (replace `border-gold-primary/30 border-t-gold-primary` with `gold-gradient-spinner`):**
- `src/components/LoadingSpinner.tsx`
- `src/components/trip/MountedTabs.tsx` (line 16)
- `src/components/mobile/MobileTripTabs.tsx` (line 335)
- `src/components/events/EventDetailContent.tsx` (line 57)
- `src/components/pro/admin/JoinRequestsPanel.tsx` (line 60)
- `src/components/pro/admin/RoleManager.tsx` (lines 293, 437, 651)
- `src/components/pro/admin/BulkRoleAssignmentDialog.tsx` (line 143)
- `src/features/calendar/components/CalendarImportModal.tsx` (lines 438, 641)
- `src/components/FilesTab.tsx` (line 358)
- `src/pages/AdvertiserDashboard.tsx` (line 196)

#### 3. Trip Card Icons (Location Pin, Calendar) → Metallic Gold

The `text-gold-primary` on `MapPin` and `Calendar` icons maps to the flat HSL. Update `--gold-primary` HSL to match `#c49746` more precisely.

**File: `src/index.css`** (line 262-265) — Update legacy tokens:
```css
--gold-primary: 38 52% 52%;   /* maps to #c49746 */
--gold-light: 46 98% 82%;     /* maps to #feeaa5 */
--gold-dark: 28 54% 15%;      /* maps to #533517 */
--gold-glow: 36 78% 56%;      /* maps to #e8af48 */
```

This single change fixes ALL `text-gold-primary`, `bg-gold-primary`, `border-gold-primary` usages site-wide to use the correct metallic gold instead of mustard.

#### 4. Calendar Selected Date Fill

`src/components/ui/calendar.tsx` line 38 uses `bg-gold-primary` — this will automatically improve with the HSL token update above. The fill will become the warm metallic gold instead of flat mustard.

#### 5. Trip Members Icon

`src/components/TripHeader.tsx` line 610 uses `text-gold-primary` — also automatically fixed by the HSL update.

---

### Summary

| Change | Scope | Files |
|--------|-------|-------|
| HSL token update (fixes ALL flat gold) | Global | `index.css` |
| Pro/Event tabs → `accent-ring-active` | 3 tab components | `ProTabNavigation`, `EventDetailContent`, `MobileTripTabs` |
| Spinner gradient class | CSS + ~10 components | `index.css` + all spinner locations |
| CTA ring already done | No change needed | — |

Total: ~15 files touched. The HSL token update alone fixes the majority of flat-gold complaints across the entire site.

