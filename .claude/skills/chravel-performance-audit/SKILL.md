---
name: chravel-performance-audit
description: Audit Chravel's performance on critical paths — trip loading, chat rendering, map interactions, and mobile responsiveness. Use when investigating slow loads, jank, excessive re-renders, or bundle size issues. Triggers on "performance", "slow loading", "janky", "re-rendering too much", "bundle size", "why is this slow".
---

# Chravel Performance Audit

Audit and fix performance on Chravel's critical paths.

## Critical Performance Paths

### 1. Trip Loading (highest priority)
- Auth resolution → trip query → member check → data hydration → render
- Target: < 2s to meaningful content on 3G
- Risk: "Trip Not Found" flash during auth hydration

### 2. Chat Rendering
- Realtime message subscription → state update → scroll → render
- Target: No jank on 100+ message threads
- Risk: Re-renders on every message, scroll position jumps

### 3. Calendar / Event Views
- Event list rendering with date grouping
- Target: Smooth scroll, fast tab switching
- Risk: Heavy re-renders on date navigation

### 4. Map Interactions
- Marker rendering, place search, autocomplete
- Target: < 300ms response to pan/zoom
- Risk: Excessive API calls on drag, marker re-creation

### 5. Smart Import
- Document parsing → preview rendering → save
- Target: < 5s for standard document
- Risk: Blocking main thread during parsing

## Common Issues

### Excessive Re-renders
- Object/array dependencies in useEffect/useMemo causing infinite updates
- Context providers re-rendering entire subtrees
- Missing React.memo on expensive list items
- State updates triggering unnecessary child renders

### Bundle Size
- Unused imports from large libraries
- No code splitting on route-level
- Heavy dependencies loaded eagerly
- Images not optimized or lazy-loaded

### Network
- Waterfall requests (sequential when parallel is possible)
- Missing query deduplication (TanStack Query should handle this)
- Oversized API responses (fetching all fields when few needed)
- No prefetching for likely navigation targets

### Mobile-Specific
- Heavy animations on low-end devices
- Large images without responsive sizing
- Scroll jank from complex list rendering
- Keyboard appearance causing layout thrash

## Audit Output

- Critical path performance assessment
- Top 5 performance issues with file locations and severity
- Recommended fixes with expected impact
- Bundle size analysis if relevant
