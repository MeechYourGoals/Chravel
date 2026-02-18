

# Fix Build Errors + Add Drag-to-Reorder Trip Cards

## Part 1: Fix 8 Build Errors (5 bugs)

### Bug 1: `MobileTripPayments.tsx` -- wrong variable name in `PaymentItem` (lines 615, 618)

The `PaymentItem` sub-component receives `formatCurrency` as a prop, but lines 615 and 618 reference `formatCurrencyFn` (the parent component's local variable name). Fix: change `formatCurrencyFn` to `formatCurrency` on lines 615 and 618.

### Bug 2: `MobileTripPayments.tsx` -- missing import for `formatCurrency` (line 396)

The parent component defines `formatCurrencyFn` which calls `formatCurrency`, but `formatCurrency` is never imported. Fix: add `import { formatCurrency } from '@/services/currencyService';` to the imports.

### Bug 3: `PaymentMessage.tsx` -- `getPaymentMethodName` doesn't exist (line 152)

Line 152 calls `getPaymentMethodName(method)` but no such function exists. The correct function (already imported on line 8) is `getPaymentMethodDisplayName`. Fix: replace `getPaymentMethodName` with `getPaymentMethodDisplayName`.

### Bug 4: `leave_trip` RPC not in generated types (2 files)

`useTripMembers.ts` line 244 and `useTripMembersQuery.ts` line 196 call `supabase.rpc('leave_trip', ...)` but the generated Supabase types don't include this function. Fix: cast the function name with `as any` -- same pattern used elsewhere in the codebase.

### Bug 5: `trip_members.status` column not in types

`tripService.ts` line 665 selects `'status'` from `trip_members` but the generated types don't have this column. Fix: change `.select('status')` to `.select('*')` and cast the result to access `status`.

---

## Part 2: Drag-to-Reorder Trip Cards

### Design Decision: Mobile Interaction

Add a **"Rearrange" option in the existing 3-dot menu** on each card. When tapped, the dashboard enters a reorder mode where cards wiggle (iOS-style) and can be dragged. A "Done" button exits reorder mode. On desktop, cards are always draggable via a small grip handle.

New trips appear at the **beginning** of the list (not the end).

### New Files

**`src/components/dashboard/SortableCardWrapper.tsx`**
- Uses `useSortable` from dnd-kit
- Wraps each card with transform/transition styles
- Shows subtle elevation + shadow when dragging
- On desktop: small grip icon (GripVertical) as drag handle, always visible
- In reorder mode (mobile): entire card is draggable, cards wiggle with CSS animation

**`src/components/dashboard/SortableTripGrid.tsx`**
- Generic wrapper accepting `items`, `getId`, `renderCard`, `dashboardType`, `userId`
- Sets up `DndContext` with `PointerSensor` (distance: 8) + `TouchSensor` (distance: 8)
- Uses `rectSortingStrategy` for grid reordering
- Accepts `reorderMode` boolean to toggle between normal and reorder states
- On drag end, reorders items and persists

**`src/hooks/useDashboardCardOrder.ts`**
- Loads/saves order to localStorage key `chravel:cardOrder:<userId>:<dashboardType>`
- `applyOrder(items, getId)`: sorts items by saved order, **prepends** new IDs (not in saved order) to the front
- `saveOrder(orderedIds)`: persists to localStorage
- Filters out stale IDs that no longer exist in current items

### Modified Files

**Card 3-dot menus (TripCard, ProTripCard, EventCard)**
- Add "Rearrange" option to the existing dropdown menu
- When tapped, calls a callback `onEnterReorderMode()` passed down from the grid

**`src/components/home/TripGrid.tsx`**
- Add `reorderMode` state per tab
- Wrap the three card `.map()` blocks (My Trips, Pro, Events) with `SortableTripGrid`
- Pass `dashboardType` ("my_trips" / "pro" / "events") and current user ID
- When in reorder mode, show a floating "Done" button to exit
- Pending/invited trips remain below the sortable section (not draggable)

### UX Details

- **Desktop:** Small grip icon in card header. Grab cursor on hover. Cards animate into place during drag. No reorder mode needed -- always draggable via handle.
- **Mobile/Tablet:** Tap 3-dot menu, select "Rearrange". Cards start wiggling. Touch-drag to reorder. Tap "Done" to save and exit. Scrolling still works (distance threshold prevents accidental drags).
- **New trips:** Appear at the beginning of the list.
- **Deleted trips:** Silently removed from saved order.
- **Tab independence:** My Trips, Pro, and Events each have their own saved order.

### What Does NOT Change

- No new database tables or migrations
- No changes to existing card button functionality (View, Invite, Share, Recap, swipe-to-delete)
- No changes to archived/hidden/pending trip handling
- No new dependencies (dnd-kit packages are already installed)
