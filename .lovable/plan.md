

# Fix OG Preview Fallback: Use ChravelApp Logo Instead of Random Unsplash Photos

## Problem

When a trip has no user-uploaded cover photo, shared links (iMessage, Slack, etc.) show a random Unsplash landscape image that has nothing to do with the trip. This is confusing for recipients. The same issue affects both Share Trip links and Invite links.

The root cause is that four separate files all fall back to random Unsplash stock photos when `cover_image_url` is null in the database.

## Solution

Replace every Unsplash fallback with the branded ChravelApp OG image that already exists in the project at `public/chravelapp-og-20251219.png` (hosted at `https://chravel.app/chravelapp-og-20251219.png`). This is the "Less Chaos More Coordination" globe logo, properly sized for OG previews (1200x630).

The priority chain becomes:
1. User-uploaded cover photo (if present) -- always preferred
2. ChravelApp branded OG image -- the default for all trips without a cover photo

No AI-generated images. No random stock photos.

## Files to Change

### 1. `supabase/functions/generate-trip-preview/index.ts` (Edge Function)

**Line 585** -- Change the fallback when building `tripData` for real (non-demo) trips:

```
Before: trip.cover_image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop'
After:  trip.cover_image_url || 'https://chravel.app/chravelapp-og-20251219.png'
```

This affects all Share Trip previews in iMessage, Slack, Twitter, etc.

### 2. `supabase/functions/generate-invite-preview/index.ts` (Edge Function)

**Line 646** -- Same change for the invite preview:

```
Before: trip.cover_image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop'
After:  trip.cover_image_url || 'https://chravel.app/chravelapp-og-20251219.png'
```

This affects all Invite link previews when no cover photo exists.

### 3. `supabase/functions/share-preview/index.ts` (Edge Function)

**Line 14** -- Update the DEFAULT_IMAGE constant:

```
Before: const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop';
After:  const DEFAULT_IMAGE = 'https://chravel.app/chravelapp-og-20251219.png';
```

This is used in multiple fallback paths within this function (invalid invites, expired invites, trip not found, errors).

### 4. `src/components/share/ShareTripModal.tsx` (Frontend)

**Line 140** -- Update the in-app share modal's cover image fallback:

```
Before: trip.coverPhoto || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop'
After:  trip.coverPhoto || '/chravelapp-og-20251219.png'
```

This ensures the in-app share modal preview card also shows the branded logo when no cover photo is uploaded, matching what recipients will see.

## What Stays the Same

- Demo trips keep their specific Supabase Storage cover images (already correctly configured)
- Trips WITH an uploaded cover photo continue to use that photo (first priority)
- The "invite not found" fallback in `generate-invite-preview` already references `chravel-logo.png` -- this stays as-is since it's a different scenario (broken invite, not a trip without a cover)
- All OG tag structure, caching, and redirect behavior remains unchanged

## After Deployment

The two Supabase edge functions (`generate-trip-preview`, `generate-invite-preview`, `share-preview`) need to be redeployed for the changes to take effect on live previews. Existing cached previews in iMessage/Slack may take up to 5 minutes to expire (based on the current `Cache-Control: max-age=300` setting).

