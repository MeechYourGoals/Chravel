

## Add Confirmation/Reservation Number to Personal Basecamp

### What
Add a "Confirmation / Reservation #" text field to the `BasecampSelector` modal, visible **only** when used for personal basecamp (not trip basecamp). This lets users store their hotel/Airbnb confirmation number alongside their accommodation details.

### How

**1. Add `isPersonal` prop to `BasecampSelector`** (`src/components/BasecampSelector.tsx`)
- New optional prop: `isPersonal?: boolean`
- New state: `confirmationNumber` string
- Render a new input field between Nickname and Type when `isPersonal` is true
- Pass confirmation number through to `onBasecampSet` callback

**2. Extend `BasecampLocation` type** (`src/types/basecamp.ts`)
- Add optional `confirmationNumber?: string` field

**3. Extend `PersonalBasecamp` interface** (`src/services/basecampService.ts`)
- Add optional `confirmation_number?: string` field
- Include it in the upsert payload

**4. Pass `isPersonal` from `BasecampsPanel`** (`src/components/places/BasecampsPanel.tsx`)
- Add `isPersonal` to the personal basecamp `BasecampSelector` instance (line 457)

**5. Database migration** — add `confirmation_number text` column to the `personal_basecamps` table

### UI (personal basecamp modal only)
The new field sits between "Nickname" and "Type":
```
Confirmation / Reservation #
┌─────────────────────────────────┐
│ e.g., ABC123, 20688856          │
└─────────────────────────────────┘
```

Same styling as existing inputs. No validation required — free-text field.

