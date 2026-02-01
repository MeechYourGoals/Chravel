
# Fix: PDF Export Founder Bypass + Revert Button Styling

## Summary

This plan addresses three issues:
1. **PDF Export showing limits for founder** - ccamechi@gmail.com should have unlimited exports
2. **Gold Invite/PDF Recap buttons** - Need to revert to gray styling in TripHeader
3. **Gold Travel Tabs** - Need to revert active tab styling to not use gold gradient

---

## Issue 1: PDF Export Founder Bypass

### Root Cause
The `usePdfExportUsage.ts` hook determines if a user is a "paid user" by checking their `app_role` and `subscription_product_id` from the database. It never checks if the user is a super admin (like ccamechi@gmail.com).

### Fix
Add super admin check at the top of the hook's tier detection logic.

**File:** `src/hooks/usePdfExportUsage.ts`

```typescript
// Add import at top
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';

// In the hook, check super admin first:
const { user } = useAuth();

// Super admins always get unlimited
const isSuperAdmin = isSuperAdminEmail(user?.email);

// Update getTier function
const getTier = (): UserTier => {
  if (isSuperAdmin) return 'pro'; // Super admins = pro tier
  if (!profileData) return 'free';
  // ... rest of existing logic
};

// Also update isPaidUser:
const isPaidUser = tier !== 'free' || isSuperAdmin;
```

---

## Issue 2: Revert Invite & PDF Recap Buttons to Gray

### Current State (incorrect)
The buttons in TripHeader.tsx use gold gradient styling:
- Invite button: `bg-gradient-to-r ${accentColors.gradient}`
- PDF Recap button: `bg-gradient-to-r ${accentColors.gradient}`

### Desired State
Both should be gray like the TripCard buttons:
`bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700`

**File:** `src/components/TripHeader.tsx`

**Invite button (lines 609-616):**
```typescript
// FROM:
className={`flex items-center justify-center gap-1 bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 hover:scale-105 shrink-0`}

// TO:
className="flex items-center justify-center gap-1 bg-gray-800/50 hover:bg-gray-700/50 text-white text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600 shrink-0"
```

**PDF Recap button (lines 622-627):**
```typescript
// FROM (enabled state):
canExport ? `bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white hover:scale-105`

// TO:
canExport ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700 hover:border-gray-600'
```

---

## Issue 3: Revert Travel Tabs Active Styling

### Current State (incorrect)
Active tabs use gold gradient with white text (hard to read):
```typescript
isActive && enabled
  ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md`
```

### Desired State
Active tabs should use a subtle highlight without the gold gradient. A common pattern is a semi-transparent white background or a simple border indicator.

**File:** `src/components/TripTabs.tsx`

**Lines 261-267:**
```typescript
// FROM:
${isActive && enabled
  ? `bg-gradient-to-r ${accentColors.gradient} text-white shadow-md`
  : enabled
  ? 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white hover:shadow-sm'
  : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-40 grayscale'}

// TO:
${isActive && enabled
  ? 'bg-white/20 text-white border border-white/30 shadow-sm'
  : enabled
  ? 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white hover:shadow-sm'
  : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-40 grayscale'}
```

This gives the active tab a subtle white background and border without the hard-to-read gold + white text combination.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePdfExportUsage.ts` | Add super admin check for unlimited exports |
| `src/components/TripHeader.tsx` | Revert Invite + PDF Recap buttons to gray styling |
| `src/components/TripTabs.tsx` | Revert active tab from gold gradient to subtle white style |

---

## Visual Reference

### Buttons After Fix
| Button | New Style |
|--------|-----------|
| Invite | Gray background, white text |
| PDF Recap | Gray background, white text |
| View | Gold gradient (unchanged - this is the primary action) |

### Tabs After Fix
| State | Style |
|-------|-------|
| Active | White semi-transparent bg + white text + subtle border |
| Inactive | Dark semi-transparent bg + gray text |
| Disabled | Very subtle bg + grayed out text + lock icon |

---

## Technical Summary

1. **PDF Export bypass** - Single line check for super admin email at the start of tier detection
2. **Button styling** - Replace gradient classes with gray background classes
3. **Tab styling** - Replace gradient-based active state with neutral white/transparent style
