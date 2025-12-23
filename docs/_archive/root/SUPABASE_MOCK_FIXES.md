# Supabase Mock Fixes

## Issues Fixed

### 1. Promise Chaining Issue with `.insert().select().single()`

**Problem**: The mock's `insert().select()` was returning a Promise directly, causing `.single()` to fail with "select(...).single is not a function" because Promises don't have a `.single()` method.

**Solution**: Modified `insert()` to return a builder object where:
- `.select()` returns an object with a `.single()` method (not a Promise)
- `.single()` can be called directly on the insert builder
- The builder properly chains: `insert().select().single()` → returns Promise

**Code Change**:
```typescript
insert: vi.fn((values: any) => {
  const inserted = Array.isArray(values) ? values : [values];
  const insertKey = `${table}:insert`;
  mockData[insertKey] = inserted;
  
  return {
    select: vi.fn(() => {
      // Return builder object with .single() method
      return {
        single: vi.fn(() => {
          const singleItem = Array.isArray(inserted) ? inserted[0] : inserted;
          return Promise.resolve({ data: singleItem, error: null });
        }),
      };
    }),
    single: vi.fn(() => {
      const singleItem = Array.isArray(inserted) ? inserted[0] : inserted;
      return Promise.resolve({ data: singleItem, error: null });
    }),
  };
}),
```

### 2. Mock Data Key Mismatch for Unfiltered Queries

**Problem**: When `setMockData()` was called without a filter, data was stored under `${table}:all`, but queries using `.eq()` looked for `${table}:${column}:${value}`. This caused tests to time out waiting for data that was never found.

**Solution**: Created `getMockData()` and `getMockError()` helper functions that:
1. First check for a specific key: `${table}:${column}:${value}`
2. Fall back to `${table}:all` if the specific key doesn't exist
3. Return `null` if neither key exists

**Code Change**:
```typescript
// Helper to get data with fallback to :all key
const getMockData = (table: string, column?: string, value?: any): any[] | null => {
  if (column && value !== undefined) {
    const specificKey = `${table}:${column}:${value}`;
    if (mockData[specificKey] !== undefined) {
      return mockData[specificKey];
    }
  }
  // Fall back to :all key if specific key not found
  const allKey = `${table}:all`;
  return mockData[allKey] || null;
};
```

All query builders now use `getMockData()` instead of directly accessing `mockData[key]`.

## Test Impact

These fixes ensure that:

1. **Trip Creation Tests** (`trip-creation-flow.test.tsx`):
   - `.insert().select().single()` chains work correctly
   - Unfiltered mock data (e.g., `setMockData('trip_invites', [...])`) is found when queried with `.eq('trip_id', ...)`

2. **All Other Tests**:
   - Any test using `.insert().select().single()` pattern will work
   - Tests that seed data without filters will find it when queried

## Verification

The mock now correctly supports:
- ✅ `.insert().select().single()` chaining
- ✅ `.insert().single()` direct chaining
- ✅ Unfiltered data lookup with fallback to `:all` key
- ✅ Specific filtered data lookup
- ✅ Error handling for both patterns
