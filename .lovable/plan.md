
# Landing Page Polish & Build Fix

## Overview
This plan addresses 4 categories of changes:
1. **Build Error Fix** - Type compatibility issue in MobileProTripDetail
2. **ChravelTabs Typography** - Larger feature names, brighter italic descriptions, remove Tasks quote
3. **Screenshot Cropping** - Remove iPhone status bar from "Create Trip" and "One Hub" screenshots
4. **Copy Update** - Update "Chravel Recap PDFs" description text

---

## 1. Build Error Fix

### Problem
The `tripData` prop passed to `MobileTripTabs` has `trip_type` typed as `string`, but the component expects `'consumer' | 'pro' | 'event'`.

### Solution
**File:** `src/pages/MobileProTripDetail.tsx` (lines 112-120)

Add explicit type assertion for `trip_type`:

```typescript
return {
  ...convertedTrip,
  participants: proParticipants,
  roster: proParticipants,
  proTripCategory: 'Sports – Pro, Collegiate, Youth',
  enabled_features: supabaseTrip.enabled_features || defaultFeatures,
  createdBy: supabaseTrip.created_by,
  trip_type: 'pro' as const,  // ← Add 'as const' to preserve literal type
} as ProTripData & { createdBy?: string };
```

Also fix line 85 in the demo mode path:
```typescript
trip_type: 'pro' as const,
```

---

## 2. ChravelTabs Typography Updates

### File: `src/components/conversion/ReplacesGrid.tsx`

#### A) Increase Feature Name Font Size

**Desktop (lines 43-48):**
- Change from `text-lg lg:text-xl` to `text-xl lg:text-2xl`

**Mobile (lines 65-72):**
- Change from `text-xl sm:text-2xl` to `text-2xl sm:text-3xl`

#### B) Make Descriptions Brighter White + Italic

**Desktop (lines 55-57):**
- Change from `text-white/80` to `text-white italic`

**Mobile (lines 85-90):**
- Change from `text-white` to `text-white italic`
- Both already have font-medium, just need italic added

### File: `src/components/conversion/ReplacesGridData.ts`

#### C) Remove "I thought you were handling?" Quote from Tasks

**Lines 147-152:**
- Remove or comment out `benefitQuote: '"I thought you were handling?"'` from the Tasks category

```typescript
// BEFORE
{
  key: 'tasks',
  title: 'Tasks',
  subtitle: '',
  icon: '✅',
  benefitQuote: '"I thought you were handling?"',
  benefit: 'Reminders and accountability for everyone.',
  // ...
}

// AFTER
{
  key: 'tasks',
  title: 'Tasks',
  subtitle: '',
  icon: '✅',
  // benefitQuote removed
  benefit: 'Reminders and accountability for everyone.',
  // ...
}
```

---

## 3. Screenshot Cropping (Status Bar Removal)

The screenshots currently show iPhone status bars (time, signal, battery). These need to be cropped.

### Approach
Create new cropped versions of the screenshots using CSS `object-fit` and `object-position`, or by applying inline cropping styles that hide the top portion.

### File: `src/components/landing/sections/ProblemSolutionSection.tsx`

#### Option A: CSS Cropping (Recommended - No new assets needed)

For both "Create Trip" and "One Hub" screenshots, wrap in a container that clips the top:

```tsx
{/* Create Trip Screenshot - with status bar cropped */}
<div className="w-full h-[520px] flex items-center justify-center overflow-hidden">
  <div className="relative w-full" style={{ marginTop: '-28px' }}>
    <img 
      src={createNewTrip}
      alt="Create New Trip form interface"
      className="w-full h-auto object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
    />
  </div>
</div>

{/* One Hub Screenshot - with status bar cropped */}
<div className="w-full h-[520px] flex items-center justify-center overflow-hidden">
  <div className="relative w-full" style={{ marginTop: '-28px' }}>
    <img 
      src={oneHubChat}
      alt="Trip chat interface"
      className="w-full h-auto object-contain rounded-2xl shadow-2xl border border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300"
    />
  </div>
</div>
```

The `marginTop: '-28px'` shifts the image up within its container, and `overflow-hidden` on the parent clips the status bar from view. Apply same treatment to mobile versions.

---

## 4. Chravel Recap PDFs Copy Update

### File: `src/components/landing/sections/AiFeaturesSection.tsx`

**Lines 39-43:**

```typescript
// BEFORE
{
  icon: <ScrollText className="text-primary" size={28} />,
  title: 'Chravel Recap PDFs',
  description: 'Overwhelmed or want to Share off App? Get a Simple Summary PDF of the trip'
}

// AFTER  
{
  icon: <ScrollText className="text-primary" size={28} />,
  title: 'Chravel Recap PDFs',
  description: 'Sharing recommendations or just want a quick overview of the trip? Get a simple summary PDF.'
}
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/MobileProTripDetail.tsx` | Add `as const` to `trip_type: 'pro'` (2 locations) |
| `src/components/conversion/ReplacesGrid.tsx` | Increase font sizes, add italic to descriptions |
| `src/components/conversion/ReplacesGridData.ts` | Remove `benefitQuote` from Tasks |
| `src/components/landing/sections/ProblemSolutionSection.tsx` | Add CSS cropping to hide status bars |
| `src/components/landing/sections/AiFeaturesSection.tsx` | Update Recap PDFs description text |

---

## Visual Result

### ChravelTabs After Changes
- **Feature names** (Chat, Calendar, etc.): Larger, bolder
- **Descriptions**: Pure white (#FFFFFF) instead of gray, italicized
- **Tasks row**: Only shows "Reminders and accountability for everyone." (no quote)

### Screenshots After Changes
- **Create Trip**: Starts at "Create New Trip" modal header (no 9:41 / battery)
- **One Hub**: Starts at "Fantasy Football Chat's Annual..." (no 9:51 / battery)
- **Trip Invite**: Unchanged (middle screenshot doesn't show status bar)

### AI Features Section
- **Recap PDFs**: New copy reads "Sharing recommendations or just want a quick overview of the trip? Get a simple summary PDF."
