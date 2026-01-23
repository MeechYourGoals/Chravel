
# Update Edge Functions and tripsData.ts with Supabase Storage URLs

## Overview

The image migration is complete. All 12 demo images have been successfully uploaded to Supabase Storage at `trip-media/demo-covers/`. Now we need to update all references to use these permanent public URLs.

## Storage URL Pattern

```text
Base URL: https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers/
```

| Trip ID | Filename |
|---------|----------|
| 1 | cancun-spring-break.jpg |
| 2 | tokyo-adventure.jpg |
| 3 | bali-destination-wedding.jpg |
| 4 | nashville-bachelorette.jpg |
| 5 | coachella-festival.jpg |
| 6 | dubai-birthday.jpg |
| 7 | phoenix-golf-outing.jpg |
| 8 | tulum-yoga-wellness.jpg |
| 9 | napa-wine-getaway.jpg |
| 10 | aspen-corporate-ski.jpg |
| 11 | disney-family-cruise.jpg |
| 12 | yellowstone-hiking-group.jpg |

---

## Files to Modify

### 1. supabase/functions/generate-trip-preview/index.ts

**Change**: Replace Unsplash URLs for trips 1-12 with Supabase Storage URLs

Before:
```typescript
coverPhoto: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&h=630&fit=crop',
```

After:
```typescript
coverPhoto: 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers/cancun-spring-break.jpg',
```

### 2. supabase/functions/get-trip-preview/index.ts

**Change**: Same updates for trips 1-12 in the `demoTrips` object

### 3. supabase/functions/generate-invite-preview/index.ts

**Change**: Same updates for trips 1-12 in the `demoTrips` object

### 4. src/data/tripsData.ts

**Change**: Remove WebP imports and replace with storage URLs

Before:
```typescript
import cancunSpringBreak from '../assets/trip-covers/cancun-spring-break.webp';
// ... 11 more imports
coverPhoto: cancunSpringBreak,
```

After:
```typescript
const DEMO_COVERS_BASE = 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';

// In each trip object:
coverPhoto: `${DEMO_COVERS_BASE}/cancun-spring-break.jpg`,
```

---

## Technical Details

### URL Mapping (Complete)

| Trip ID | Old (Unsplash/WebP) | New (Supabase Storage) |
|---------|---------------------|------------------------|
| 1 | cancun-spring-break.webp | cancun-spring-break.jpg |
| 2 | tokyo-adventure.webp | tokyo-adventure.jpg |
| 3 | bali-destination-wedding.webp | bali-destination-wedding.jpg |
| 4 | nashville-bachelorette.webp | nashville-bachelorette.jpg |
| 5 | coachella-festival-new.webp | coachella-festival.jpg |
| 6 | dubai-birthday-cameron-knight.webp | dubai-birthday.jpg |
| 7 | phoenix-golf-outing.webp | phoenix-golf-outing.jpg |
| 8 | tulum-yoga-wellness.webp | tulum-yoga-wellness.jpg |
| 9 | napa-wine-getaway.webp | napa-wine-getaway.jpg |
| 10 | aspen-corporate-ski.webp | aspen-corporate-ski.jpg |
| 11 | disney-family-cruise.webp | disney-family-cruise.jpg |
| 12 | yellowstone-hiking-group.webp | yellowstone-hiking-group.jpg |

### Benefits

1. **Visual Parity**: In-app images now match OG preview images exactly
2. **Smaller Bundle**: Removes ~12 WebP images from the client bundle
3. **Single Source of Truth**: All demo trip images come from one location
4. **Crawler Compatibility**: JPG format works universally with OG scrapers

---

## Cleanup (After Verification)

Once the updates are verified working:

1. Remove the migration page route from `src/App.tsx`
2. Delete `src/pages/AdminMigrateDemoImages.tsx`
3. Optionally delete the 12 WebP files from `src/assets/trip-covers/`

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Edge functions use Supabase Storage URLs | Code inspection |
| 2 | tripsData.ts uses Supabase Storage URLs | Code inspection |
| 3 | OG preview matches in-app image | Share demo trip link, check preview |
| 4 | No Unsplash dependencies for demo trips | Search codebase for unsplash.com |
| 5 | Bundle size reduced | Build output comparison |
