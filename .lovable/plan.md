

# Collapsible Cover Photo for Desktop

## Overview

Add a collapsible/expanded toggle for the trip cover photo section on **desktop only**. When collapsed, the cover photo hero section shrinks to match the height of the Trip Description and Trip Members boxes, showing only essential info (title, location, dates). Mobile/tablet experience remains unchanged.

---

## Problem Analysis

From the screenshot, the Cover Photo box:
- Takes up the most vertical space (~200-250px via `aspect-[3/1]`)
- Contains minimal information (title, location, dates, edit button)
- Feels like "wasted space" when users don't add a cover photo
- Forces users to scroll to see the actual trip content (Chat, Calendar, etc.)

The Trip Description + Trip Members section:
- Uses `max-h-[240px]` for the members panel
- More compact, information-dense layout

---

## Solution: Desktop-Only Collapsible Hero

### User Experience

**Expanded (Default)**
```text
┌─────────────────────────────────────────────────────────────────┐
│ [Trip Title]                               [Add Cover Photo] ▲  │
│                                                                 │
│              (Cover Photo / Gradient Background)                │
│                                                                 │
│ 📍 Location                                                     │
│ 📅 Date Range                                            [Edit] │
└─────────────────────────────────────────────────────────────────┘
```

**Collapsed (Same height as Trip Details box)**
```text
┌──────────────────────────────────────────────────────────────────┐
│ [Trip Title]                                                     │
│ 📍 Location  •  📅 Date Range                    [Expand ▼] [📷] │
└──────────────────────────────────────────────────────────────────┘
```

### Key Behaviors

1. **Toggle Button**: A chevron icon (▲/▼) in the top-right corner
2. **Collapsed Height**: Fixed to match Trip Description/Members box (~140-160px)
3. **Expanded Height**: Current `aspect-[3/1]` behavior
4. **State Persistence**: Store preference in localStorage per-trip or globally
5. **Animation**: Smooth transition with `max-height` and opacity
6. **Desktop Only**: Hide toggle on mobile (< lg breakpoint)

---

## Technical Implementation

### File 1: `src/components/TripHeader.tsx`

**Add State & Storage**
```tsx
// Add near other state declarations (around line 103)
const [isHeroCollapsed, setIsHeroCollapsed] = useState(() => {
  // Load preference from localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('chravel-hero-collapsed') === 'true';
  }
  return false;
});

// Persist toggle state
const toggleHeroCollapsed = () => {
  const newValue = !isHeroCollapsed;
  setIsHeroCollapsed(newValue);
  localStorage.setItem('chravel-hero-collapsed', String(newValue));
};
```

**Modify Hero Section (lines 396-484)**

Update the Cover Photo Hero div to support collapsed mode on desktop:

```tsx
{/* Cover Photo Hero - Collapsible on Desktop */}
<div
  data-trip-section="hero"
  className={cn(
    'relative rounded-2xl md:rounded-3xl overflow-hidden bg-cover bg-center transition-all duration-300',
    // Mobile/tablet: always full height
    drawerLayout ? 'h-full min-h-[320px] mb-0' : '',
    // Desktop: collapsed vs expanded
    !drawerLayout && (
      isHeroCollapsed 
        ? 'h-[140px] min-h-[140px]'  // Match details box height
        : 'aspect-[3/1] min-h-[200px]'
    ),
    'mb-0 md:mb-8'
  )}
  style={{
    backgroundImage: coverPhoto ? `url(${coverPhoto})` : undefined,
    backgroundColor: !coverPhoto ? '#1a1a2e' : undefined,
  }}
>
  {/* ... existing gradient overlay ... */}
  
  {/* Collapsed Layout: Horizontal info row */}
  {isHeroCollapsed && !drawerLayout && (
    <div className="absolute inset-0 flex items-center justify-between px-6 z-10">
      {/* Left: Title + Location/Date inline */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white line-clamp-1">
          {trip.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          {trip.location && (
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-primary" />
              {trip.location}
            </span>
          )}
          {trip.dateRange && (
            <>
              <span className="text-gray-500">•</span>
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-primary" />
                {trip.dateRange}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Expand button */}
        <button
          onClick={toggleHeroCollapsed}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-all text-white/80 hover:text-white"
          title="Expand cover photo"
        >
          <ChevronDown size={16} />
        </button>
        {/* Edit button */}
        <button
          onClick={() => setShowEditModal(true)}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-all text-white/80 hover:text-white"
          title="Edit trip details"
        >
          <Edit size={14} />
        </button>
      </div>
    </div>
  )}

  {/* Expanded Layout: Current layout with title top-left, details bottom-left */}
  {!isHeroCollapsed && (
    <>
      {/* Existing title at TOP-LEFT */}
      <div className="absolute top-4 left-4 right-16 z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg line-clamp-2">
          {trip.title}
        </h1>
      </div>
      
      {/* Collapse button - Desktop only, top right */}
      <div className="hidden lg:block absolute top-4 right-4 z-10">
        <button
          onClick={toggleHeroCollapsed}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg transition-all text-white/80 hover:text-white"
          title="Collapse cover photo"
        >
          <ChevronUp size={16} />
        </button>
      </div>
      
      {/* Existing location/dates at BOTTOM-LEFT */}
      {/* ... keep existing code ... */}
      
      {/* Add Cover Photo Button - adjusted position */}
      {/* ... keep existing code ... */}
      
      {/* Edit Button - Bottom right */}
      {/* ... keep existing code ... */}
    </>
  )}
</div>
```

**Add Import**
```tsx
// Add to imports (line 1-14)
import { ChevronUp, ChevronDown } from 'lucide-react';
```

---

## Visual Height Matching

The "Trip Members" panel uses:
```tsx
className="max-h-[240px]"
```

For the collapsed hero, we'll use a fixed height that creates visual harmony:
- **Collapsed height**: `h-[140px]` - Matches the visual density of the details box
- This is approximately 60% of the member panel's max-height, accounting for the gradient/border styling

---

## State Persistence Options

**Option A: Global Preference (Recommended)**
- One setting for all trips
- Key: `chravel-hero-collapsed`
- Simpler UX, consistent experience

**Option B: Per-Trip Preference**
- Each trip remembers its own state
- Key: `chravel-hero-collapsed-{tripId}`
- More flexible, more storage

The plan uses **Option A** for simplicity.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/TripHeader.tsx` | Add collapsed state, toggle button, conditional layouts |

---

## Scope Summary

- **Lines Changed**: ~50 lines added/modified
- **New Dependencies**: None (uses existing Lucide icons)
- **Database Changes**: None
- **Mobile Impact**: None (desktop-only feature)
- **Accessibility**: Toggle button has proper title/aria attributes

---

## Edge Cases

1. **Cover photo with collapsed mode**: Background still visible at 140px height with gradient
2. **Very long trip titles**: Uses `line-clamp-1` in collapsed mode
3. **Long location names**: Truncates naturally in flex layout
4. **Initial load flicker**: localStorage read is synchronous, no flash

