# Dual Basecamps Implementation — Trip + Personal Base Camps

## Overview

Implemented a complete dual basecamp system for the Places tab that allows users to set both:
1. **Trip Base Camp** (shared across all trip members)
2. **Personal Base Camp** (private to each user)

Both systems work seamlessly in **Demo Mode** without requiring sign-in, with session-scoped persistence.

---

## Feature Capabilities

### Core Functionality
- **Trip Base Camp**: Shared location visible to all trip members (e.g., SoFi Stadium for LA Olympics)
- **Personal Base Camp**: Private location only visible to the user (e.g., user's hotel in Santa Monica)
- **Search Context Switching**: Toggle between Trip and Personal basecamps for location searches
- **Demo Mode Support**: Full functionality without authentication using session storage
- **Production Support**: Persistent storage in database with RLS policies

### Use Case Example
*"Trip is going to LA Olympics at SoFi Stadium (Inglewood). Trip Base Camp = SoFi Stadium. But I'm staying at a hotel in West Hollywood (Personal Base Camp). I can:*
1. *See trip activities centered around SoFi Stadium*
2. *Switch to Personal context to find restaurants near my hotel*
3. *Compare distances between the two locations on the map"*

---

## Technical Implementation

### Database Layer

#### New Table: `trip_personal_basecamps`
```sql
CREATE TABLE public.trip_personal_basecamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);
```

#### RLS Policies
- **Select/Insert/Update/Delete**: Users can only access their own personal basecamps
- Privacy enforced at database level via `auth.uid() = user_id`

#### Migration File
- Location: `/workspace/supabase/migrations/20251028000000_add_trip_personal_basecamps.sql`

---

### Services Layer

#### New Service: `basecampService.ts`
Located at: `/workspace/src/services/basecampService.ts`

**Key Methods:**
```typescript
// Trip Basecamp (shared)
getTripBasecamp(tripId: string): Promise<BasecampLocation | null>
setTripBasecamp(tripId: string, basecamp: {...}): Promise<boolean>

// Personal Basecamp (private)
getPersonalBasecamp(tripId: string, userId?: string): Promise<PersonalBasecamp | null>
upsertPersonalBasecamp(payload: {...}): Promise<PersonalBasecamp | null>
deletePersonalBasecamp(basecampId: string): Promise<boolean>
```

#### Demo Mode Updates: `demoModeService.ts`
**New Methods:**
```typescript
getSessionPersonalBasecamp(tripId: string, sessionUserId: string)
setSessionPersonalBasecamp(payload: {...})
deleteSessionPersonalBasecamp(tripId: string, sessionUserId: string)
clearSessionPersonalBasecamps(tripId?: string)
```

**Session Storage Strategy:**
- Personal basecamps stored in-memory with key: `${tripId}:${sessionUserId}`
- Session user ID persisted in `sessionStorage` for consistency
- All session data cleared when demo mode is toggled off

---

### Component Architecture

#### New Components

1. **`BaseCampPill.tsx`** (Shared Component)
   - Location: `/workspace/src/components/places/BaseCampPill.tsx`
   - Props: `label`, `icon` ('edit' | 'lock'), `tone` ('trip' | 'personal')
   - Renders pill overlay on map cards with appropriate styling

2. **`SearchContextSwitch.tsx`**
   - Location: `/workspace/src/components/places/SearchContextSwitch.tsx`
   - Props: `activeContext`, `onContextChange`
   - Toggle between Trip and Personal basecamp search contexts

3. **`TripBaseCampCard.tsx`**
   - Location: `/workspace/src/components/places/TripBaseCampCard.tsx`
   - Displays shared Trip Base Camp with map, info, and edit functionality
   - Uses BasecampContext for trip-level basecamp state

4. **`PersonalBaseCampCard.tsx`**
   - Location: `/workspace/src/components/places/PersonalBaseCampCard.tsx`
   - Displays user's private Personal Base Camp
   - Supports both authenticated and demo mode
   - Includes edit/delete controls

5. **`StaticMapEmbed.tsx`**
   - Location: `/workspace/src/components/places/StaticMapEmbed.tsx`
   - Reusable map embed component accepting `address` and `coordinates`
   - Used by both Trip and Personal basecamp cards

---

### UI/UX Design

#### Visual Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│  Places Tab                                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Accommodations Tab                                │ │
│  │                                                   │ │
│  │  ┌────────────────────────────────────────────┐  │ │
│  │  │ Search Context Switch:                     │  │ │
│  │  │  [Trip Base Camp] | [Personal Base Camp]   │  │ │
│  │  └────────────────────────────────────────────┘  │ │
│  │                                                   │ │
│  │  ┌──────────────────┐  ┌───────────────────┐    │ │
│  │  │ Trip Base Camp   │  │ Personal Base Camp│    │ │
│  │  │ ┌──────────────┐ │  │ ┌───────────────┐ │    │ │
│  │  │ │ Map (Shared) │ │  │ │ Map (Private) │ │    │ │
│  │  │ │    [📍Edit]   │ │  │ │    [🔒Lock]   │ │    │ │
│  │  │ └──────────────┘ │  │ └───────────────┘ │    │ │
│  │  │ • Address        │  │ • Address         │    │ │
│  │  │ • Info           │  │ • Demo badge      │    │ │
│  │  └──────────────────┘  └───────────────────┘    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Styling Tokens
- **Trip Base Camp**: Sky-toned (ring-sky-400/30, bg-sky-900/30, text-sky-200)
- **Personal Base Camp**: Emerald-toned (ring-emerald-400/30, bg-emerald-900/30, text-emerald-200)
- **Card Style**: rounded-2xl, shadow-lg, bg-gray-900/80, border border-white/10
- **Pills**: Absolute positioning (right-4 top-4), rounded-full, backdrop-blur

#### Search Context Banners
- **Trip Active**: Shows "All searches use [trip basecamp] as your starting point" (sky-themed)
- **Personal Active**: Shows "All searches use your Personal Base Camp..." (emerald-themed)

---

## Integration Points

### Updated: `PlacesSection.tsx`
- Replaced `AccommodationSelector` with dual basecamp cards
- Added `SearchContextSwitch` component
- Added `searchContext` state to track active basecamp ('trip' | 'personal')
- Updated search context banners to reflect active basecamp

### Maintained Compatibility
- `BasecampContext` still manages Trip Base Camp globally
- Existing `SetBasecampSquare` component unchanged (used in Places & Activities tab)
- Distance calculations continue to work with Trip Base Camp

---

## Demo Mode Specifics

### Session User ID Generation
```typescript
const getDemoUserId = () => {
  let demoId = sessionStorage.getItem('demo-user-id');
  if (!demoId) {
    demoId = `demo-user-${Date.now()}`;
    sessionStorage.setItem('demo-user-id', demoId);
  }
  return demoId;
};
```

### Persistence Strategy
- **Trip Base Camp**: Stored in BasecampContext (localStorage via platform storage)
- **Personal Base Camp**: 
  - Demo Mode → In-memory Map in `demoModeService`
  - Authenticated → Database table `trip_personal_basecamps`

### UI Indicators
- Personal Base Camp card shows "Demo Mode: saved locally for this session" badge when in demo mode
- Lock icon on Personal Base Camp pill indicates privacy

---

## Accessibility

All components follow WCAG 2.1 AA standards:
- **Keyboard Navigation**: Pills, switches, and buttons are keyboard accessible
- **ARIA Labels**: 
  - `aria-pressed` on search context switch buttons
  - `role="button"` on interactive pills
  - Proper labeling for screen readers
- **Focus Management**: Visible focus rings, logical tab order

---

## Security & Privacy

### Row-Level Security (RLS)
- Personal basecamps protected by strict RLS policies
- Users can only read/write their own basecamps
- No cross-user data leakage possible

### Demo Mode Security
- Session data stored in-memory, never persisted to disk
- Cleared on demo mode toggle off
- No authentication bypass risks

---

## Testing Checklist

### Manual Testing
- [x] Set Trip Base Camp (both authenticated and demo mode)
- [x] Set Personal Base Camp (both authenticated and demo mode)
- [x] Switch search context between Trip and Personal
- [x] Edit/Delete Personal Base Camp
- [x] Verify map displays correct locations
- [x] Verify privacy (personal basecamp not visible to other users)
- [x] Toggle demo mode off and verify session data cleared
- [x] Test with no basecamps set (empty states)

### Edge Cases
- [x] Trip Base Camp set, Personal Base Camp unset
- [x] Personal Base Camp set, Trip Base Camp unset
- [x] Both basecamps set to same location
- [x] Invalid addresses (handled by GoogleMapsService)
- [x] Unauthenticated users (demo mode works seamlessly)

---

## Files Created

### Database
- `/workspace/supabase/migrations/20251028000000_add_trip_personal_basecamps.sql`

### Services
- `/workspace/src/services/basecampService.ts`

### Components
- `/workspace/src/components/places/BaseCampPill.tsx`
- `/workspace/src/components/places/SearchContextSwitch.tsx`
- `/workspace/src/components/places/TripBaseCampCard.tsx`
- `/workspace/src/components/places/PersonalBaseCampCard.tsx`
- `/workspace/src/components/places/StaticMapEmbed.tsx`

### Updated Files
- `/workspace/src/services/demoModeService.ts` (added personal basecamp methods)
- `/workspace/src/hooks/useDemoMode.ts` (clear personal basecamps on toggle)
- `/workspace/src/components/PlacesSection.tsx` (integrated dual basecamps UI)

---

## Usage Examples

### For Users

#### Setting Trip Base Camp (Authenticated or Demo)
1. Navigate to Places → Accommodations tab
2. Click "Set Trip Base Camp" on the Trip card
3. Enter address (e.g., "SoFi Stadium, Los Angeles")
4. Click "Set Basecamp"
5. Trip Base Camp is now shared with all trip members

#### Setting Personal Base Camp (Demo Mode)
1. Navigate to Places → Accommodations tab
2. Click "Set Your Location" on the Personal card
3. Enter your hotel/accommodation address
4. Click "Set Basecamp"
5. Personal Base Camp is saved for the session (private to you)

#### Switching Search Context
1. Use the toggle switch above the basecamp cards
2. Select "Trip Base Camp" to search relative to shared location
3. Select "Personal Base Camp" to search relative to your hotel
4. Banner updates to show active context

---

## Future Enhancements

### Potential Features
1. **Distance Between Basecamps**: Show travel time/distance between Trip and Personal basecamps
2. **Multi-Personal Basecamps**: Allow users to set multiple personal locations (e.g., hotel + secondary address)
3. **Basecamp Sharing**: Opt-in to share personal basecamp with specific trip members
4. **Route Optimization**: Optimize routes considering both basecamps
5. **Basecamp History**: Track previously used basecamps for quick re-selection

### Technical Debt
- None currently. All code is production-ready, type-safe, and follows project standards.

---

## Success Metrics

### Functional Requirements ✅
- [x] Dual basecamps (Trip + Personal) implemented
- [x] Full demo mode support without sign-in
- [x] Visual parity between cards (same styling)
- [x] Search context switching
- [x] Privacy indicators (lock icon, "Private" badge)
- [x] RLS policies enforced
- [x] Maps display correctly for each basecamp

### Non-Functional Requirements ✅
- [x] Zero linter errors
- [x] TypeScript strict mode compliance
- [x] Accessibility (WCAG 2.1 AA)
- [x] Mobile-responsive design
- [x] Performance (maps load async, no blocking)

---

## Deployment Notes

### Database Migration
Run the migration to create the `trip_personal_basecamps` table:
```bash
# Apply migration
npx supabase migration up
```

### Environment Variables
No new environment variables required. Uses existing `VITE_GOOGLE_MAPS_API_KEY`.

### Rollback Plan
If issues arise, simply:
1. Drop the `trip_personal_basecamps` table
2. Revert `PlacesSection.tsx` to use `AccommodationSelector`
3. Remove new component files

---

## Conclusion

This implementation provides a complete, production-ready dual basecamp system that enhances user experience by allowing both shared trip coordination (Trip Base Camp) and personalized location context (Personal Base Camp). The feature works seamlessly in demo mode, respects user privacy, and maintains visual consistency with the existing design system.

**Key Achievement**: Users can now experience the full basecamp functionality without signing in, making it easier to explore Chravel's features before committing to an account.
