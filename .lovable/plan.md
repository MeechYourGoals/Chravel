

# Pro Trip Categories Revamp

## Overview

Replace the legacy Pro trip category system (long labels like "Sports -- Pro, Collegiate, Youth") with a clean 7-category enum system using stable internal values. Add category-aware search/filtering to the Trips list.

## What Changes

### 1. New Category Enum System

Replace the current 6 categories with 7 new ones, in this exact order:

| # | Display Label | Internal Enum Value |
|---|--------------|-------------------|
| 1 | Touring | `touring` |
| 2 | Sports | `sports` |
| 3 | Work | `work` |
| 4 | School | `school` |
| 5 | Productions | `productions` |
| 6 | Celebrations | `celebrations` |
| 7 | Other | `other` |

### 2. Legacy Migration Map

Old labels stored in DB (`categories` JSONB column) will be mapped to new enum values:

- "Sports -- Pro, Collegiate, Youth" -> `sports`
- "Tour -- Music, Comedy, etc." -> `touring`
- "Business Travel" / "Business Trips" -> `work`
- "School Trip" -> `school`
- "Content" -> `productions`
- "Other" / unknown / missing -> `other`

No new categories need backfill since "Celebrations" is brand new.

### 3. Search Synonym Map

Each category gets a list of search keywords that match it:

- `touring`: tour, touring, music, comedy, concert
- `sports`: sport, sports, athletic, game, team
- `work`: work, business, corporate, retreat, office
- `school`: school, education, student, academic, campus
- `productions`: production, productions, content, shoot, film, tv, media
- `celebrations`: celebration, celebrations, wedding, bachelor, bachelorette, party, anniversary
- `other`: other

### 4. Category Filter Chips on Trips List

When viewing Pro trips, a horizontal row of filter chips appears below the search bar. Tapping a chip filters to that category. Tapping again clears the filter.

## Files Modified

| File | Change |
|------|--------|
| `src/types/proCategories.ts` | Full rewrite: new `ProCategoryEnum` type with 7 values, display config, legacy mapping function, synonym map, ordered list |
| `src/types/pro.ts` | Update `ProTripData.proTripCategory` type to use new enum values |
| `src/components/CreateTripModal.tsx` | Update category dropdown to show 7 new labels in correct order, default to `touring`, pass enum value |
| `src/components/EditTripModal.tsx` | Update category selector to use new enum values and display labels |
| `src/components/pro/CategorySelector.tsx` | Update to use new category configs |
| `src/components/pro/CategoryTags.tsx` | Update to use new display labels from enum |
| `src/utils/tripConverter.ts` | `convertSupabaseTripToProTrip`: use legacy mapping function to normalize old DB values to new enum |
| `src/utils/semanticTripFilter.ts` | Add category field to `TripSearchableFields`, include category + synonyms in `matchesQuery`, add `cat:` power syntax support |
| `src/data/pro-trips/*.ts` | Update all mock data `proTripCategory` values to new enum values |
| `src/pages/Index.tsx` | Add category filter state, render category chips when `viewMode === 'tripsPro'`, pass filter to `filterProTrips` |
| `src/services/tripService.ts` | Add `category` to `CreateTripData` interface |
| `supabase/functions/create-trip/index.ts` | Accept `category` from request body, store as `categories: [{type: 'pro_category', value: category}]` in the trips insert |
| `src/services/mockRolesService.ts` | No change needed (already ignores category param) |
| `src/components/pro/RoleSwitcher.tsx`, `OrgChartNode.tsx`, `EditMemberRoleModal.tsx`, etc. | Update type imports to use new enum type (mostly just type annotation changes) |

### Database

**Backfill migration** -- Update existing Pro trips with legacy category labels to new enum values:

```sql
UPDATE trips
SET categories = jsonb_build_array(
  jsonb_build_object('type', 'pro_category', 'value',
    CASE
      WHEN categories->0->>'value' ILIKE '%tour%' THEN 'touring'
      WHEN categories->0->>'value' ILIKE '%sport%' THEN 'sports'
      WHEN categories->0->>'value' ILIKE '%business%' THEN 'work'
      WHEN categories->0->>'value' ILIKE '%school%' THEN 'school'
      WHEN categories->0->>'value' ILIKE '%content%' THEN 'productions'
      ELSE 'other'
    END
  )
)
WHERE trip_type = 'pro'
  AND categories IS NOT NULL
  AND jsonb_array_length(categories) > 0
  AND categories->0->>'type' = 'pro_category';
```

No schema changes needed -- the `categories` JSONB column already exists and stores the right structure.

## Technical Details

### New `proCategories.ts` Structure

```typescript
export type ProCategoryEnum =
  | 'touring' | 'sports' | 'work' | 'school'
  | 'productions' | 'celebrations' | 'other';

export interface ProCategoryConfig {
  id: ProCategoryEnum;
  label: string;           // Display label
  description: string;
  searchSynonyms: string[]; // Words that match this category in search
  roles: string[];          // Default roles for this category
  terminology: { teamLabel: string; memberLabel: string; leaderLabel: string };
}

// Ordered array (not a Record) to guarantee UI order
export const PRO_CATEGORIES_ORDERED: ProCategoryConfig[] = [
  { id: 'touring', label: 'Touring', ... },
  { id: 'sports', label: 'Sports', ... },
  ...
];

// Legacy label -> enum mapping
export function normalizeLegacyCategory(raw: string): ProCategoryEnum { ... }
```

### Search Integration

The `semanticTripFilter.ts` will be updated so that when searching Pro trips:

1. The `TripSearchableFields` interface gets a `categories` field populated with the enum value AND its synonym list
2. Typing "wedding" matches "celebrations" category trips even if "wedding" isn't in the title
3. `cat:touring` syntax filters by exact category match (parsed before the general substring search)

### Edge Function Fix

The `create-trip` edge function currently ignores the `category` field. It will be updated to:

1. Accept `category` from the request body
2. If `trip_type === 'pro'` and `category` is provided, set `categories: [{type: 'pro_category', value: category}]` in the insert

### Backward Compatibility

- `convertSupabaseTripToProTrip` already reads `categories` JSONB -- will add `normalizeLegacyCategory()` call so old values display correctly
- Unknown/missing categories gracefully fall back to `other`
- The old `ProTripCategory` type alias will be kept temporarily as a deprecated alias pointing to `ProCategoryEnum` to avoid breaking 27+ files at once; components will be migrated incrementally

### No Regressions

- Group (consumer) trips: no category selector shown, no changes
- Event trips: no category selector shown, no changes
- Only Pro trip creation/editing/display affected

