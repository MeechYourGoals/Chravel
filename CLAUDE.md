# 🧭 CHRAVEL ENGINEERING MANIFESTO
> **Purpose:** Universal AI coding standards for Chravel (group travel + events platform)
> **Audience:** All AI assistants (Claude Code, Cursor, Lovable, Codex, Google Jules, Replit)
> **Non-negotiable:** Every edit must pass `npm run lint && npm run typecheck && npm run build` before commit

---

## ⚙️ GLOBAL PRINCIPLES

### 1. Zero Syntax Errors
- Every `{}`, `()`, `[]`, and JSX tag must close cleanly
- Before returning code, mentally simulate: `npm run build`
- If uncertain about bracket balance → simplify the structure

### 2. TypeScript Strict Mode
- `"strict": true` in `tsconfig.json` enforced
- All function parameters and return types explicitly typed
- No `any` types unless interfacing with untyped third-party libs (comment why)

### 3. Vercel Production Environment
- Code must compile in fresh Node 18+ environment
- No experimental syntax (e.g., decorators, stage-3 proposals)
- Test locally with `npm run dev` before pushing

### 4. Readability > Cleverness
- Explicit variable names: `userTrips` not `ut`
- Separate concerns: one function = one responsibility
- Comment complex logic (especially map calculations, state transitions)

---

## 🧠 REACT PATTERNS

### Component Structure
```tsx
// ✅ GOOD: Hooks first, handlers next, return last
export function TripCard({ trip }: { trip: Trip }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useNavigate();

  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// ❌ BAD: Hooks inside conditionals
if (user) {
  const [trips, setTrips] = useState([]); // BREAKS RULES OF HOOKS
}
```

### State Management

**useState:**
```tsx
// ✅ Always type initial state
const [trips, setTrips] = useState<Trip[]>([]);
const [loading, setLoading] = useState(false);

// ❌ Avoid untyped state
const [data, setData] = useState(); // What type is this?
```

**useEffect:**
```tsx
// ✅ GOOD: Cleanup + mount guard for async
useEffect(() => {
  let mounted = true;

  async function loadTrips() {
    setLoading(true);
    const trips = await fetchTrips();
    if (mounted) {
      setTrips(trips);
      setLoading(false);
    }
  }

  loadTrips();
  return () => { mounted = false; };
}, []);

// ❌ BAD: No cleanup = memory leak
useEffect(() => {
  fetchTrips().then(setTrips); // Will update unmounted component
}, []);
```

**Derived State:**
```tsx
// ✅ Compute above return, don't store in state
const activeTrips = trips.filter(t => t.status === 'active');
const totalCost = trips.reduce((sum, t) => sum + t.cost, 0);

return <div>{activeTrips.length} active trips</div>;

// ❌ Don't create duplicate state
const [activeTrips, setActiveTrips] = useState([]); // Unnecessary
```

### Event Handlers
```tsx
// ✅ Memoize handlers passed as props
const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
  if (!e.latLng) return;
  const lat = e.latLng.lat();
  const lng = e.latLng.lng();
  setSelectedLocation({ lat, lng });
}, []);

// ✅ Guard against null/undefined
const handleDeleteTrip = useCallback(async (tripId: string | undefined) => {
  if (!tripId) {
    console.error('Trip ID is required');
    return;
  }
  await deleteTrip(tripId);
}, []);
```

---

## 🗄️ SUPABASE INTEGRATION

### Database Queries

**Standard Pattern:**
```tsx
// ✅ Type the query, handle errors, update state safely
const { data: trips, error } = await supabase
  .from('trips')
  .select('*')
  .eq('creator_id', userId);

if (error) {
  console.error('Failed to fetch trips:', error);
  setError(error.message);
  return;
}

setTrips(trips ?? []);
```

**Insert with Optimistic Updates:**
```tsx
// ✅ Show immediate feedback, rollback on error
const optimisticTrip = { ...newTrip, id: 'temp-id', created_at: new Date().toISOString() };
setTrips(prev => [...prev, optimisticTrip]);

const { data, error } = await supabase
  .from('trips')
  .insert(newTrip)
  .select()
  .single();

if (error) {
  setTrips(prev => prev.filter(t => t.id !== 'temp-id')); // Rollback
  return;
}

setTrips(prev => prev.map(t => t.id === 'temp-id' ? data : t)); // Replace temp
```

**Realtime Subscriptions:**
```tsx
useEffect(() => {
  const channel = supabase
    .channel('trip-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'trips' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setTrips(prev => [...prev, payload.new as Trip]);
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### Rules
1. **Never** call Supabase directly in JSX (`onClick={() => supabase.from...}`)
2. **Always** go through `/src/integrations/supabase/client.ts`
3. **Handle** `error` explicitly (don't ignore it)
4. **Type** results using generated `Database` types from Supabase CLI

---

## 🗺️ GOOGLE MAPS / PLACES / LOCATION LOGIC

### Map Initialization
```tsx
// ✅ GOOD: Ref with proper typing and guards
const mapRef = useRef<google.maps.Map | null>(null);
const mapContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!mapContainerRef.current || mapRef.current) return;

  mapRef.current = new google.maps.Map(mapContainerRef.current, {
    center: { lat: 34.0522, lng: -118.2437 },
    zoom: 12,
    disableDefaultUI: false,
    zoomControl: true,
  });
}, []);

// ❌ BAD: No null check
mapRef.current.setZoom(15); // CRASHES if map not loaded
```

### Map Operations
```tsx
// ✅ Always guard map operations
function centerOnLocation(location: { lat: number; lng: number }) {
  if (!mapRef.current) {
    console.warn('Map not initialized');
    return;
  }

  mapRef.current.setCenter(location);
  mapRef.current.setZoom(14);
}

// ✅ Conditional logic with fallback
if (mapRef.current && selectedPlace) {
  mapRef.current.panTo(selectedPlace.geometry.location);
} else {
  setSearchOrigin(null);
  setError('Map unavailable');
}
```

### Event Handlers
```tsx
// ✅ Debounced map events (prevent excessive API calls)
const handleMapDragEnd = useMemo(
  () =>
    debounce(() => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      if (!center) return;

      fetchNearbyPlaces({ lat: center.lat(), lng: center.lng() });
    }, 300),
  []
);

useEffect(() => {
  if (!mapRef.current) return;
  const listener = mapRef.current.addListener('dragend', handleMapDragEnd);
  return () => { google.maps.event.removeListener(listener); };
}, [handleMapDragEnd]);
```

### Places Autocomplete
```tsx
// ✅ Proper initialization and cleanup
useEffect(() => {
  if (!inputRef.current) return;

  const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
    types: ['geocode', 'establishment'],
    componentRestrictions: { country: 'us' },
  });

  const listener = autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;

    setSelectedPlace(place);
    if (mapRef.current) {
      mapRef.current.panTo(place.geometry.location);
    }
  });

  return () => { google.maps.event.removeListener(listener); };
}, []);
```

### Markers & Overlays
```tsx
// ✅ Render markers from typed array
const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

useEffect(() => {
  if (!mapRef.current) return;

  // Clear old markers
  markers.forEach(m => m.setMap(null));

  // Create new markers
  const newMarkers = places.map(place => {
    if (!place.geometry?.location) return null;

    return new google.maps.Marker({
      position: place.geometry.location,
      map: mapRef.current,
      title: place.name,
    });
  }).filter(Boolean) as google.maps.Marker[];

  setMarkers(newMarkers);

  return () => { newMarkers.forEach(m => m.setMap(null)); };
}, [places]);
```

### Rules
1. **One map instance per page** — use props/context for mode changes
2. **Always null-check** `mapRef.current` before operations
3. **Debounce** high-frequency events (drag, zoom, bounds_changed)
4. **Clean up** event listeners in `useEffect` return
5. **Type all coordinates** as `{ lat: number; lng: number }`

---

## 🧩 CHRAVEL-SPECIFIC UI PATTERNS

### Layout Hierarchy
```
┌─────────────────────────────┐
│   Map (Google Maps)         │  ← 50-60% viewport height
├─────────────────────────────┤
│   Trip Menu / Options       │  ← Scrollable list
├─────────────────────────────┤
│ [Chat] [Media] [Pay] [⚙️]   │  ← Bottom tabs (fixed)
└─────────────────────────────┘
```

### Component Reuse
```tsx
// ✅ Single <MapView> with mode prop
<MapView
  mode="tripBase"        // or "personalBase"
  center={tripLocation}
  markers={tripStops}
  onPlaceSelect={handlePlaceSelect}
/>

// ❌ Don't duplicate map components
<TripMap />        // Bad: separate implementations
<PersonalMap />    // cause divergence and bugs
```

---

## 🧰 ERROR PREVENTION & BUILD SAFETY

### Pre-Commit Checks

**Add to `.husky/pre-commit`:**
```bash
#!/bin/sh
npm run lint
npm run typecheck
```

**Update `package.json`:**
```json
{
  "scripts": {
    "lint": "eslint . --fix",
    "lint:check": "eslint .",
    "typecheck": "tsc --noEmit",
    "build": "npm run lint:check && npm run typecheck && vite build",
    "prepare": "husky install"
  }
}
```

### Common Error Patterns

**❌ Unclosed Brackets:**
```tsx
// BAD
if (condition) {
  doSomething();
  }  // ← Extra brace
} else {
  doSomethingElse();
}
```

**✅ Fix:**
```tsx
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}
```

**❌ Missing Return in Arrow Functions:**
```tsx
// BAD: No explicit return
const Component = () =>
  <div>
    Title
  // Missing closing tag + return
```

**✅ Fix:**
```tsx
const Component = () => {
  return (
    <div>
      Title
    </div>
  );
};
```

---

## 📏 CODE STYLE & FORMATTING

### Prettier Config (`.prettierrc`)
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

### ESLint Config (`.eslintrc.json`)
```json
{
  "extends": ["eslint:recommended", "plugin:react/recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-unused-vars": "error",
    "no-unexpected-multiline": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 🚀 DEPLOYMENT WORKFLOW

### Local Testing
```bash
# 1. Lint check
npm run lint

# 2. Type check
npm run typecheck

# 3. Production build
npm run build

# 4. Test production build locally
npm run preview
```

### Vercel Environment
- Assumes **fresh install** (no cached `node_modules`)
- Uses **Node 18+** and **Vite 5**
- Runs `npm install && npm run build`
- Fails fast on syntax/type errors

### What Breaks Builds
1. **Syntax errors** (unclosed brackets, missing semicolons)
2. **Type errors** (accessing undefined properties)
3. **Missing dependencies** (not in `package.json`)
4. **Environment variables** (not set in Vercel dashboard)
5. **Import errors** (case-sensitive paths, missing files)

---

## 🤖 AI AGENT CONDUCT

### Required Behavior
1. **Validate syntax** before returning code
2. **Test mentally:** Would `npm run build` pass?
3. **Preserve context:** Don't break existing working code
4. **Comment complex logic** (especially algorithms, state machines)
5. **Use stable APIs only** (no stage-3 proposals)

### Prohibited Actions
1. ❌ Outputting **partial code** that won't compile
2. ❌ Using **experimental syntax** not in TypeScript 5
3. ❌ Creating **duplicate implementations** of existing components
4. ❌ Ignoring **error objects** from async calls
5. ❌ Adding **console.log** without removing before commit

### When Uncertain
- **Default to simpler code** over complex abstractions
- **Ask for clarification** rather than guessing intent
- **Preserve working code** — refactor incrementally
- **Test assumptions** — add comments explaining logic

---

## ✅ FINAL RULE

> **"If it doesn't build, it doesn't ship."**

Every AI assistant must guarantee:
1. Generated code passes `npm run lint && npm run typecheck && npm run build`
2. Syntax is clean (balanced brackets, proper JSX)
3. Types are explicit (no `any` unless documented)
4. Follows patterns in this manifest
5. Ready for Vercel deployment

---

## 📚 REFERENCE

### Key Files
- `/src/integrations/supabase/client.ts` — Supabase singleton
- `/src/types/` — Type definitions
- `/src/components/` — Reusable components
- `/src/lib/` — Utility functions

### Quick Commands
```bash
npm run dev          # Local dev server
npm run lint         # Check linting
npm run typecheck    # Check types
npm run build        # Production build
npm run preview      # Preview production build
```

### When Builds Fail
1. Read the **exact error message** (line number + file)
2. Check **bracket balance** in that file
3. Run `npm run typecheck` locally
4. Fix syntax → commit → push
5. If still failing → check Vercel logs

---

**Last Updated:** 2025-10-31
**Maintained By:** AI Engineering Team + Meech
