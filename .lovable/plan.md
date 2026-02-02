

# Hide Recs Tab and Saved Places for Authenticated Users

## Summary

Hide the Chravel Recs feature from authenticated users in production. This includes:
1. Removing the Recs tab from desktop and mobile navigation
2. Hiding the "Saved Places" menu item from Settings

The features will remain visible and functional in Demo Mode only.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Set `showRecsTab={isDemoMode}` and `showRecsOption={isDemoMode}` for all navigation components |
| `src/components/home/TripViewToggle.tsx` | Update grid to use 3 columns when Recs hidden, 4 when visible |
| `src/components/ConsumerSettings.tsx` | Filter out "Saved Places" from sections list when not in demo mode |

---

## Technical Changes

### 1. Index.tsx - Desktop Navigation (3 locations)

**Lines 673-678 (Unauthenticated view):**
```tsx
// FROM:
showRecsTab={true}
recsTabDisabled={true}

// TO:
showRecsTab={false}
recsTabDisabled={false}
```

**Lines 832-837 (Authenticated + Demo Mode toggle available):**
```tsx
// FROM:
showRecsTab={true}
recsTabDisabled={!isDemoMode}

// TO:
showRecsTab={isDemoMode}
recsTabDisabled={false}
```

**Lines 1008-1013 (Main authenticated desktop view):**
```tsx
// FROM:
showRecsTab={true}
recsTabDisabled={!isDemoMode}

// TO:
showRecsTab={isDemoMode}
recsTabDisabled={false}
```

### 2. Index.tsx - Mobile Trip Type Switcher (3 locations)

**Lines 787-802, 949-964, 1137-1152:**
```tsx
// FROM:
showRecsOption={true}
recsDisabled={!isDemoMode}

// TO:
showRecsOption={isDemoMode}
recsDisabled={false}
```

### 3. TripViewToggle.tsx - Dynamic Grid Columns

**Line 44:**
```tsx
// FROM:
className="... grid grid-cols-4 ..."

// TO:
className={`bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg grid ${showRecsTab ? 'grid-cols-4' : 'grid-cols-3'} h-12 sm:h-16 gap-0.5 sm:gap-1`}
```

### 4. ConsumerSettings.tsx - Hide Saved Places Section

**Lines 44-55:**
```tsx
// FROM:
const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'ai-concierge', label: 'AI Concierge', icon: Sparkles },
  { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
  { id: 'saved-recs', label: 'Saved Places', icon: Bookmark, comingSoon: !isAppPreview },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'permissions', label: 'Permissions', icon: KeyRound },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'settings', label: 'General Settings', icon: Settings },
  { id: 'archived', label: 'Archived Trips', icon: Archive }
];

// TO:
const allSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'ai-concierge', label: 'AI Concierge', icon: Sparkles },
  { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
  { id: 'saved-recs', label: 'Saved Places', icon: Bookmark, demoOnly: true },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'permissions', label: 'Permissions', icon: KeyRound },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'settings', label: 'General Settings', icon: Settings },
  { id: 'archived', label: 'Archived Trips', icon: Archive }
];

// Filter out demo-only sections when not in demo mode
const { isDemoMode } = useDemoMode();
const sections = allSections.filter(section => !section.demoOnly || isDemoMode);
```

---

## Visual Result

### Authenticated Users (Production)
| Location | What Shows |
|----------|------------|
| Desktop nav | My Trips, Pro, Events (3 tabs, evenly spaced) |
| Mobile view selector | My Trips, Pro Trips, Events (3 options) |
| Consumer Settings | No "Saved Places" menu item |

### Demo Mode
| Location | What Shows |
|----------|------------|
| Desktop nav | My Trips, Pro, Events, Recs (4 tabs) |
| Mobile view selector | All 4 options including Chravel Recs |
| Consumer Settings | "Saved Places" menu item visible |

---

## Benefits

1. **Cleaner production UI** - No grayed-out placeholders or "Coming Soon" badges
2. **Professional appearance** - 3-column grid looks intentional, not incomplete
3. **Easy rollback** - When Recs feature is ready, change `isDemoMode` to `true`

