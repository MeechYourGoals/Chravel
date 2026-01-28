# Bundle Size Baseline

Generated: 2026-01-28

## Summary

| Category | Size (Raw) | Size (gzip) |
|----------|------------|-------------|
| **Main JS** | 1,009.65 kB | 275.40 kB |
| **CSS** | 210.69 kB | 31.38 kB |
| **PDF (lazy)** | 614.95 kB | 179.98 kB |
| **Charts (lazy)** | 374.05 kB | 97.91 kB |

## Key Code-Split Chunks

| Chunk | Size (Raw) | Size (gzip) |
|-------|------------|-------------|
| index (main) | 1,009.65 kB | 275.40 kB |
| TripDetailModals | 237.18 kB | 65.75 kB |
| Index (home) | 229.89 kB | 54.95 kB |
| SettingsMenu | 176.14 kB | 44.06 kB |
| supabase | 167.58 kB | 41.60 kB |
| react-vendor | 161.36 kB | 52.47 kB |
| pdf | 614.95 kB | 179.98 kB |
| charts | 374.05 kB | 97.91 kB |

## Optimizations Applied

### Phase 7: Performance Polish

1. **React.lazy() Routes** ✅ (Already implemented)
   - All routes use `React.lazy()` with retry logic
   - Custom `retryImport` with exponential backoff

2. **Suspense Boundaries** ✅ (Already implemented)
   - `LazyRoute` component wraps all routes
   - Includes ErrorBoundary and auto-retry

3. **React Query Defaults** ✅ (Added)
   - Global `staleTime: 30s`
   - Global `gcTime: 5min`
   - `refetchOnWindowFocus: false` (reduces network)
   - `refetchOnReconnect: 'always'`

4. **Image Lazy Loading** ✅ (Enhanced)
   - `TripCard` uses `OptimizedImage` component
   - `MediaItem` has `loading="lazy"` and `decoding="async"`
   - `TripMediaRenderer` has `loading="lazy"`

## Notes

- Main bundle exceeds 1MB warning threshold
- Consider further code splitting for TripDetailModals
- PDF and Charts are properly lazy-loaded (only load when needed)
