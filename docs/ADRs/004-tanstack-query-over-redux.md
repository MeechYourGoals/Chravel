# ADR 004: TanStack Query over Redux

**Status:** Accepted  
**Date:** 2024-08-01  
**Deciders:** Engineering Team

## Context

Chravel needed state management for:
- Server state (trips, messages, media from Supabase)
- Client state (UI state, form state)
- Caching and synchronization
- Optimistic updates

We evaluated Redux Toolkit, TanStack Query (React Query), and Zustand.

## Decision

We chose **TanStack Query** for server state and **Zustand** for client state.

## Rationale

### Advantages of TanStack Query

1. **Server State Management**
   - Built specifically for server state
   - Automatic caching, refetching, synchronization
   - Better than Redux for async data fetching

2. **Developer Experience**
   - Less boilerplate than Redux
   - Built-in loading/error states
   - Automatic background refetching
   - DevTools for debugging

3. **Performance**
   - Automatic request deduplication
   - Smart caching strategies
   - Background updates
   - Optimistic updates built-in

4. **TypeScript Support**
   - Excellent TypeScript support
   - Type-safe queries
   - Better than Redux Toolkit TypeScript experience

### Why Not Redux?

1. **Overkill for Server State**
   - Redux is better for complex client state
   - TanStack Query handles server state better
   - Less boilerplate

2. **Boilerplate**
   - Redux requires actions, reducers, selectors
   - TanStack Query: just hooks

3. **Caching**
   - Redux doesn't handle caching automatically
   - TanStack Query has smart caching built-in

### Why Zustand for Client State?

1. **Simplicity**
   - Minimal API
   - No providers needed
   - Easy to use

2. **Performance**
   - Lightweight
   - Only re-renders components that use specific state

3. **TypeScript**
   - Excellent TypeScript support
   - Type-safe stores

## Alternatives Considered

### Redux Toolkit
- **Pros:** Mature, large ecosystem, great DevTools
- **Cons:** Too much boilerplate, overkill for our needs
- **Rejected because:** TanStack Query better for server state

### SWR
- **Pros:** Similar to TanStack Query, simpler API
- **Cons:** Less features, smaller ecosystem
- **Rejected because:** TanStack Query more feature-rich

### Context API Only
- **Pros:** Built into React, no dependencies
- **Cons:** No caching, manual refetching, performance issues
- **Rejected because:** Need proper server state management

## Consequences

### Positive
- ✅ Less boilerplate code
- ✅ Better caching and synchronization
- ✅ Automatic background updates
- ✅ Better TypeScript experience
- ✅ Easier to test

### Negative
- ⚠️ Learning curve for team (but minimal)
- ⚠️ Two libraries instead of one (but each does its job well)

### Neutral
- Redux could work, but TanStack Query is better fit
- Zustand complements TanStack Query perfectly

## Implementation Notes

- Use TanStack Query for all Supabase queries
- Use Zustand for UI state (modals, filters, etc.)
- Keep stores small and focused
- Use React Query DevTools in development

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [You Might Not Need Redux](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)

---

**Last Updated:** 2025-01-31
