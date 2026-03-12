# Chravel Code Patterns Reference

**When to use:** Load this skill when writing or reviewing React components, Supabase queries, or Google Maps integrations. Contains canonical ✅/❌ examples for Chravel's coding patterns.

---

## React Patterns

### Component Structure
```tsx
// ✅ GOOD: Hooks first, handlers next, return last
export function TripCard({ trip }: { trip: Trip }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useNavigate();

  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return <div>{/* JSX */}</div>;
}

// ❌ BAD: Hooks inside conditionals — breaks Rules of Hooks
if (user) {
  const [trips, setTrips] = useState([]);
}
```

### useState
```tsx
// ✅ Always type initial state
const [trips, setTrips] = useState<Trip[]>([]);
const [loading, setLoading] = useState(false);

// ❌ Avoid untyped state
const [data, setData] = useState();
```

### useEffect — async with cleanup
```tsx
// ✅ GOOD: Mount guard prevents state updates on unmounted component
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
  fetchTrips().then(setTrips);
}, []);
```

### Derived State
```tsx
// ✅ Compute above return, don't store in state
const activeTrips = trips.filter(t => t.status === 'active');
const totalCost = trips.reduce((sum, t) => sum + t.cost, 0);

// ❌ Don't create duplicate state
const [activeTrips, setActiveTrips] = useState([]); // Unnecessary
```

### Event Handlers
```tsx
// ✅ Memoize handlers passed as props
const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
  if (!e.latLng) return;
  setSelectedLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
}, []);

// ✅ Guard against null/undefined
const handleDeleteTrip = useCallback(async (tripId: string | undefined) => {
  if (!tripId) { console.error('Trip ID is required'); return; }
  await deleteTrip(tripId);
}, []);
```

---

## Supabase Patterns

### Standard Query
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

### Insert with Optimistic Update
```tsx
// ✅ Show immediate feedback, rollback on error
const optimisticTrip = { ...newTrip, id: 'temp-id', created_at: new Date().toISOString() };
setTrips(prev => [...prev, optimisticTrip]);

const { data, error } = await supabase.from('trips').insert(newTrip).select().single();

if (error) {
  setTrips(prev => prev.filter(t => t.id !== 'temp-id')); // Rollback
  return;
}
setTrips(prev => prev.map(t => t.id === 'temp-id' ? data : t)); // Replace temp
```

### Realtime Subscription
```tsx
useEffect(() => {
  const channel = supabase
    .channel('trip-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        setTrips(prev => [...prev, payload.new as Trip]);
      }
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

---

## Google Maps Patterns

### Map Initialization
```tsx
// ✅ Ref with proper typing and null guards
const mapRef = useRef<google.maps.Map | null>(null);
const mapContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!mapContainerRef.current || mapRef.current) return;
  mapRef.current = new google.maps.Map(mapContainerRef.current, {
    center: { lat: 34.0522, lng: -118.2437 },
    zoom: 12,
  });
}, []);

// ❌ BAD: No null check crashes if map not loaded
mapRef.current.setZoom(15);
```

### Guarded Map Operations
```tsx
function centerOnLocation(location: { lat: number; lng: number }) {
  if (!mapRef.current) { console.warn('Map not initialized'); return; }
  mapRef.current.setCenter(location);
  mapRef.current.setZoom(14);
}
```

### Debounced Map Events
```tsx
const handleMapDragEnd = useMemo(
  () => debounce(() => {
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
useEffect(() => {
  if (!inputRef.current) return;

  const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
    types: ['geocode', 'establishment'],
  });

  const listener = autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;
    setSelectedPlace(place);
    mapRef.current?.panTo(place.geometry.location);
  });

  return () => { google.maps.event.removeListener(listener); };
}, []);
```

### Markers
```tsx
// ✅ Clear old markers, create new, clean up on deps change
useEffect(() => {
  if (!mapRef.current) return;
  markers.forEach(m => m.setMap(null));

  const newMarkers = places
    .filter(p => p.geometry?.location)
    .map(p => new google.maps.Marker({ position: p.geometry!.location, map: mapRef.current, title: p.name }));

  setMarkers(newMarkers);
  return () => { newMarkers.forEach(m => m.setMap(null)); };
}, [places]);
```

---

## Common Error Patterns to Avoid

### Unclosed Brackets
```tsx
// ❌ BAD
if (condition) {
  doSomething();
  }  // ← Extra brace
} else {
  doSomethingElse();
}

// ✅ GOOD
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}
```

### Missing Return in Arrow Components
```tsx
// ❌ BAD: No explicit return
const Component = () =>
  <div>
    Title
  // Missing closing tag + return

// ✅ GOOD
const Component = () => {
  return (
    <div>Title</div>
  );
};
```

---

## UI Layout Pattern

```
┌─────────────────────────────┐
│   Map (Google Maps)         │  ← 50-60% viewport height
├─────────────────────────────┤
│   Trip Menu / Options       │  ← Scrollable list
├─────────────────────────────┤
│ [Chat] [Media] [Pay] [⚙️]   │  ← Bottom tabs (fixed)
└─────────────────────────────┘
```

Use a single `<MapView mode="tripBase" | "personalBase" />` — never duplicate map components.
