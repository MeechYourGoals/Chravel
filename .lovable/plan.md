

# Automated WebP → JPG Conversion and Upload

## Solution Overview

Create a temporary admin page that automates the entire image conversion process in-browser, eliminating all manual steps.

## How It Works

```text
User visits /admin/migrate-demo-images
        ↓
Click "Migrate Images" button
        ↓
For each WebP image:
  1. Load bundled WebP via import
  2. Draw to HTML5 Canvas
  3. Export as JPEG (quality 90%)
  4. Upload to Supabase Storage: trip-media/demo-covers/
  5. Log success/failure
        ↓
All 12 images now in Supabase Storage
        ↓
Update edge functions + tripsData.ts to use new URLs
```

## Implementation Steps

### Step 1: Create Migration Utility Page

**New File: `src/pages/AdminMigrateDemoImages.tsx`**

- Imports all 12 WebP images from `src/assets/trip-covers/`
- For each image:
  - Creates an `<img>` element to load the WebP
  - Draws it to a `<canvas>` element
  - Uses `canvas.toBlob('image/jpeg', 0.9)` to convert
  - Uploads the blob to Supabase Storage at `trip-media/demo-covers/{filename}.jpg`
- Displays progress and results

### Step 2: Add Route (Temporary)

**Modify: `src/App.tsx`**

Add a route for the migration page:
```typescript
<Route path="/admin/migrate-demo-images" element={<AdminMigrateDemoImages />} />
```

### Step 3: Run Migration (Your Action)

1. Visit `https://chravel.lovable.app/admin/migrate-demo-images`
2. Click "Migrate All Images"
3. Wait for completion (should take ~10-30 seconds)
4. Verify the 12 JPG files appear in Supabase Storage

### Step 4: Update Edge Functions

**Modify these files to use Supabase Storage URLs:**

| File | Change |
|------|--------|
| `supabase/functions/generate-trip-preview/index.ts` | Replace 12 Unsplash URLs with storage URLs |
| `supabase/functions/get-trip-preview/index.ts` | Replace demo trip URLs |
| `supabase/functions/generate-invite-preview/index.ts` | Replace demo trip URLs |

### Step 5: Update Client tripsData.ts

**Modify: `src/data/tripsData.ts`**

Replace bundled imports with storage URLs:
```typescript
// Before:
import cancunSpringBreak from '../assets/trip-covers/cancun-spring-break.webp';

// After:
const DEMO_COVERS_BASE = 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';
const coverPhotos = {
  cancunSpringBreak: `${DEMO_COVERS_BASE}/cancun-spring-break.jpg`,
  // ... all 12 images
};
```

### Step 6: Cleanup (Optional)

After confirming everything works:
- Remove the migration page route
- Delete `src/pages/AdminMigrateDemoImages.tsx`
- Remove the 12 WebP files from `src/assets/trip-covers/` (reduces bundle size)

---

## Technical Details

### Canvas Conversion Code

```typescript
const convertWebPToJpeg = async (webpUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
        'image/jpeg',
        0.9 // 90% quality
      );
    };
    img.onerror = reject;
    img.src = webpUrl;
  });
};
```

### Storage Upload Code

```typescript
const uploadToStorage = async (blob: Blob, filename: string) => {
  const { data, error } = await supabase.storage
    .from('trip-media')
    .upload(`demo-covers/${filename}`, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });
  return { data, error };
};
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/AdminMigrateDemoImages.tsx` | **CREATE** - Migration utility page |
| `src/App.tsx` | **MODIFY** - Add temporary route |
| `supabase/functions/generate-trip-preview/index.ts` | **MODIFY** - Update 12 coverPhoto URLs |
| `supabase/functions/get-trip-preview/index.ts` | **MODIFY** - Update demo trip URLs |
| `supabase/functions/generate-invite-preview/index.ts` | **MODIFY** - Update demo trip URLs |
| `src/data/tripsData.ts` | **MODIFY** - Replace imports with storage URLs |

---

## Image Mapping

| Trip ID | WebP Source | Target Storage Path |
|---------|-------------|---------------------|
| 1 | cancun-spring-break.webp | demo-covers/cancun-spring-break.jpg |
| 2 | tokyo-adventure.webp | demo-covers/tokyo-adventure.jpg |
| 3 | bali-destination-wedding.webp | demo-covers/bali-destination-wedding.jpg |
| 4 | nashville-bachelorette.webp | demo-covers/nashville-bachelorette.jpg |
| 5 | coachella-festival-new.webp | demo-covers/coachella-festival.jpg |
| 6 | dubai-birthday-cameron-knight.webp | demo-covers/dubai-birthday.jpg |
| 7 | phoenix-golf-outing.webp | demo-covers/phoenix-golf-outing.jpg |
| 8 | tulum-yoga-wellness.webp | demo-covers/tulum-yoga-wellness.jpg |
| 9 | napa-wine-getaway.webp | demo-covers/napa-wine-getaway.jpg |
| 10 | aspen-corporate-ski.webp | demo-covers/aspen-corporate-ski.jpg |
| 11 | disney-family-cruise.webp | demo-covers/disney-family-cruise.jpg |
| 12 | yellowstone-hiking-group.webp | demo-covers/yellowstone-hiking-group.jpg |

---

## Your Minimal Action Required

1. **Approve this plan** → I create the migration page
2. **Visit the migration page** → Click one button
3. **Confirm success** → I update all edge functions and tripsData

Total time: ~2 minutes of your involvement vs. 30+ minutes of manual conversion/upload.

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | All 12 JPG files exist in `trip-media/demo-covers/` | Check Supabase Storage dashboard |
| 2 | Demo trip OG preview matches in-app image | Share a demo trip link, check preview |
| 3 | No Unsplash URLs in edge functions | Code review |
| 4 | tripsData.ts uses storage URLs | Code review |
| 5 | Migration page is removed after use | Cleanup step |

