

# Upgrade Card Order Persistence to Supabase

## Problem
Card reorder positions are stored in `localStorage`, meaning they don't sync across devices or browsers. Moving to Supabase makes the order persistent and cross-device.

## Changes

### 1. New Supabase table: `dashboard_card_order`
```sql
CREATE TABLE public.dashboard_card_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_type text NOT NULL CHECK (dashboard_type IN ('my_trips', 'pro', 'events')),
  ordered_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dashboard_type)
);

ALTER TABLE public.dashboard_card_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own card order"
  ON public.dashboard_card_order FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own card order"
  ON public.dashboard_card_order FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own card order"
  ON public.dashboard_card_order FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2. Rewrite `src/hooks/useDashboardCardOrder.ts`
- Replace `localStorage` read/write with Supabase queries
- On mount: fetch saved order from `dashboard_card_order` table (with TanStack Query for caching)
- On save: upsert to `dashboard_card_order` (debounced to avoid excessive writes during drag)
- Keep localStorage as a fast synchronous fallback/cache so `applyOrder` doesn't block on network
- Flow: Load from localStorage immediately (instant UI), then fetch from Supabase in background and update if newer. On save, write to both localStorage and Supabase.

### 3. No changes to consumers
`SortableTripGrid.tsx` and other consumers use `applyOrder`/`saveOrder` — the API stays identical.

## Files

| File | Change |
|------|--------|
| `dashboard_card_order` table | New migration — create table + RLS |
| `src/hooks/useDashboardCardOrder.ts` | Rewrite to use Supabase with localStorage cache |

