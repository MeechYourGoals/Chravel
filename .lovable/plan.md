

# Convert WebP Demo Images to JPG/PNG in Supabase Storage

## Problem Recap

Currently, demo trips have **two different image sources**:
1. **In-App**: Uses bundled `.webp` files from `src/assets/trip-covers/` (e.g., `cancun-spring-break.webp`)
2. **OG Previews**: Uses Unsplash URLs in edge functions (e.g., `https://images.unsplash.com/photo-...`)

This causes visual mismatch between what users see in the app and what appears in iMessage/WhatsApp previews.

## Solution: Upload Demo Images to Supabase Storage

Convert the existing WebP demo images to JPG and upload them to the `trip-media` bucket (which is already **public**). Then update both:
- The client-side `tripsData.ts` to use those URLs
- The edge functions to use those same URLs

**Result**: Perfect visual parity between in-app and OG previews.

---

## Implementation Steps

### Step 1: Create a Demo Covers Folder in Storage

Create a folder structure in the existing `trip-media` bucket:
```text
trip-media/
  └── demo-covers/
      ├── cancun-spring-break.jpg
      ├── tokyo-adventure.jpg
      ├── bali-destination-wedding.jpg
      ├── nashville-bachelorette.jpg
      ├── coachella-festival.jpg
      ├── dubai-birthday.jpg
      ├── phoenix-golf-outing.jpg
      ├── tulum-yoga-wellness.jpg
      ├── napa-wine-getaway.jpg
      ├── aspen-corporate-ski.jpg
      ├── disney-family-cruise.jpg
      └── yellowstone-hiking-group.jpg
```

### Step 2: Convert and Upload Images (Manual Step Required)

The WebP images need to be converted to JPG/PNG and uploaded. This requires **manual action**:

1. Download the 12 `.webp` files from `src/assets/trip-covers/`:
   - `cancun-spring-break.webp`
   - `tokyo-adventure.webp`
   - `bali-destination-wedding.webp`
   - `nashville-bachelorette.webp`
   - `coachella-festival-new.webp`
   - `dubai-birthday-cameron-knight.webp`
   - `phoenix-golf-outing.webp`
   - `tulum-yoga-wellness.webp`
   - `napa-wine-getaway.webp`
   - `aspen-corporate-ski.webp`
   - `disney-family-cruise.webp`
   - `yellowstone-hiking-group.webp`

2. Convert each to `.jpg` (recommended for photo content, smaller file size) using any tool:
   - macOS: Open in Preview → Export as JPEG (quality 85-90%)
   - Online: cloudconvert.com, convertio.co
   - CLI: `convert input.webp -quality 90 output.jpg` (ImageMagick)

3. Upload to Supabase Storage:
   - Go to [Supabase Storage Dashboard](https://supabase.com/dashboard/project/jmjiyekmxwsxkfnqwyaa/storage/buckets)
   - Open `trip-media` bucket
   - Create `demo-covers` folder
   - Upload all 12 JPG files

### Step 3: Update Edge Functions with Storage URLs

After upload, the public URLs will follow this pattern:
```text
https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers/{filename}.jpg
```

Update these files:

| File | Change |
|------|--------|
| `supabase/functions/generate-trip-preview/index.ts` | Replace Unsplash URLs in demoTrips with Supabase storage URLs |
| `supabase/functions/get-trip-preview/index.ts` | Replace Unsplash URLs in demoTrips with Supabase storage URLs |
| `supabase/functions/generate-invite-preview/index.ts` | Replace Unsplash URLs in demoTrips with Supabase storage URLs |

Example change for trip ID 1:
```typescript
// Before:
coverPhoto: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&h=630&fit=crop',

// After:
coverPhoto: 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers/cancun-spring-break.jpg',
```

### Step 4: Update Client-Side tripsData.ts (Optional but Recommended)

Update `src/data/tripsData.ts` to also use the Supabase storage URLs instead of bundled imports:

```typescript
// Before:
import cancunSpringBreak from '../assets/trip-covers/cancun-spring-break.webp';
...
coverPhoto: cancunSpringBreak,

// After:
const DEMO_COVERS_BASE = 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';
...
coverPhoto: `${DEMO_COVERS_BASE}/cancun-spring-break.jpg`,
```

**Benefits of this approach:**
- Smaller bundle size (removes ~12 WebP images from the app bundle)
- Single source of truth for all demo images
- Perfect consistency between in-app and OG previews

**Tradeoff:**
- Slightly slower initial load for demo trips (network request vs bundled asset)
- If Supabase is down, demo images won't load (unlikely given Supabase's uptime SLA)

---

## Files to Modify (After Upload)

| File | Purpose |
|------|---------|
| `supabase/functions/generate-trip-preview/index.ts` | Update 12 consumer trip + Pro/Event coverPhoto URLs |
| `supabase/functions/get-trip-preview/index.ts` | Update demo trip coverPhoto URLs |
| `supabase/functions/generate-invite-preview/index.ts` | Update demo trip coverPhoto URLs |
| `src/data/tripsData.ts` | (Optional) Replace bundled imports with storage URLs |

---

## Image Mapping Reference

| Trip ID | Current WebP | New Storage Path |
|---------|--------------|------------------|
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

## Acceptance Criteria

After implementation:

| # | Criterion | How It's Achieved |
|---|-----------|-------------------|
| 1 | Demo trip OG preview shows same image as in-app | Both use same Supabase storage URL |
| 2 | Images are JPG/PNG (crawler-compatible) | Converted from WebP during upload |
| 3 | URLs are permanent and public | `trip-media` bucket is public, no expiry |
| 4 | No Unsplash dependency for demo trips | All Unsplash URLs replaced with storage URLs |
| 5 | User-uploaded trips unaffected | Only demo trip IDs (1-12) are updated |

---

## Action Required From You

Before I can implement the code changes:

1. **Convert the 12 WebP files to JPG** (any online converter works)
2. **Upload them to Supabase Storage** at `trip-media/demo-covers/`
3. **Confirm the upload is complete**

Once confirmed, I'll update all edge functions and optionally `tripsData.ts` to use the new storage URLs.

---

## Alternative: Automated Edge Function Conversion

If you'd prefer not to manually convert/upload, we could create an edge function that:
1. Fetches the Unsplash images currently in use
2. Uploads them to Supabase storage
3. Returns the new URLs

However, this adds complexity and the Unsplash images may not exactly match your WebP files. The manual approach ensures visual fidelity.

