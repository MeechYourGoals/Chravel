import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * Mock data storage system
 * Stores data under keys like:
 * - `${table}:all` - unfiltered data
 * - `${table}:${column}:${value}` - filtered data
 */
const mockDataStorage = new Map<string, any[]>();

/**
 * Set mock data for a table
 * When no filter is specified, stores under `${table}:all` and also
 * populates matching keys for each record to support filtered queries
 */
export function setMockData<T extends Record<string, any>>(
  table: string,
  data: T[],
  filter?: { column: string; value: any }
): void {
  if (filter) {
    // Store under specific filter key
    const key = `${table}:${filter.column}:${filter.value}`;
    mockDataStorage.set(key, data);
  } else {
    // Store under :all key
    const allKey = `${table}:all`;
    mockDataStorage.set(allKey, data);

    // Also populate matching keys for each record to support filtered queries
    // This allows queries like .eq('trip_id', 'trip-123') to find records
    // even when data was seeded without a filter
    data.forEach((record) => {
      Object.entries(record).forEach(([column, value]) => {
        if (value !== null && value !== undefined) {
          const filterKey = `${table}:${column}:${value}`;
          const existing = mockDataStorage.get(filterKey) || [];
          // Avoid duplicates
          if (!existing.some((r: any) => r.id === record.id)) {
            mockDataStorage.set(filterKey, [...existing, record]);
          }
        }
      });
    });
  }
}

/**
 * Get mock data for a table with optional filter
 * Falls back to `${table}:all` if specific filter key doesn't exist
 */
export function getMockData<T = any>(
  table: string,
  filter?: { column: string; value: any }
): T[] | undefined {
  if (filter) {
    const filterKey = `${table}:${filter.column}:${filter.value}`;
    const filteredData = mockDataStorage.get(filterKey);
    if (filteredData) {
      return filteredData as T[];
    }
    // Fall back to :all and filter in memory
    const allData = mockDataStorage.get(`${table}:all`);
    if (allData) {
      return allData.filter(
        (record: any) => record[filter.column] === filter.value
      ) as T[];
    }
  } else {
    return mockDataStorage.get(`${table}:all`) as T[] | undefined;
  }
  return undefined;
}

/**
 * Clear all mock data or data for a specific table
 */
export function clearMockData(table?: string): void {
  if (table) {
    // Remove all keys for this table
    const keysToDelete: string[] = [];
    mockDataStorage.forEach((_, key) => {
      if (key.startsWith(`${table}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => mockDataStorage.delete(key));
  } else {
    mockDataStorage.clear();
  }
}

/**
 * Creates a mock Supabase client for testing
 * Provides a fluent API builder pattern matching Supabase's query builder
 */
export function createMockSupabaseClient(): SupabaseClient<Database> {
  const mockFrom = vi.fn((table: string) => {
    return createQueryBuilderWithStorage(table);
  });
  const mockRpc = vi.fn();
  const mockAuth = {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: null },
      unsubscribe: vi.fn(),
    })),
  };

  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }));

  const mockClient = {
    from: mockFrom,
    rpc: mockRpc,
    auth: mockAuth,
    channel: mockChannel,
    removeChannel: vi.fn(),
  } as unknown as SupabaseClient<Database>;

  return mockClient;
}

/**
 * Create a query builder that reads from mock data storage
 * Tracks filters applied via .eq(), .neq(), etc. and retrieves matching data
 */
function createQueryBuilderWithStorage(table: string) {
  let currentFilter: { column: string; value: any; operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' } | null = null;
  let currentData: any[] | null = null;

  const like = vi.fn().mockReturnThis();
  const ilike = vi.fn().mockReturnThis();
  const is = vi.fn().mockReturnThis();
  const inArray = vi.fn().mockReturnThis();
  const contains = vi.fn().mockReturnThis();
  const order = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();
  const range = vi.fn().mockReturnThis();

  const resolveData = () => {
    // Always ensure we return an array, never undefined
    // This prevents TypeError when accessing data.length
    if (Array.isArray(currentData)) {
      return currentData;
    }
    // No filter applied or currentData is null/undefined, return all data or empty array
    const allData = getMockData(table);
    return Array.isArray(allData) ? allData : [];
  };

  const single = vi.fn().mockImplementation(async () => {
    const data = resolveData();
    return {
      data: data.length > 0 ? data[0] : null,
      error: data.length === 0 ? null : null,
    };
  });

  const maybeSingle = vi.fn().mockImplementation(async () => {
    const data = resolveData();
    return {
      data: data.length > 0 ? data[0] : null,
      error: null,
    };
  });

  const selectReturn = vi.fn().mockImplementation(async () => {
    const data = resolveData();
    return {
      data,
      error: null,
    };
  });

  const insertReturn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateReturn = vi.fn().mockResolvedValue({ data: null, error: null });
  const deleteReturn = vi.fn().mockResolvedValue({ data: null, error: null });

  const eq = vi.fn((column: string, value: any) => {
    currentFilter = { column, value, operator: 'eq' };
    currentData = getMockData(table, { column, value }) || [];
    return createFilteredChain();
  });

  const neq = vi.fn((column: string, value: any) => {
    currentFilter = { column, value, operator: 'neq' };
    const allData = getMockData(table);
    if (allData) {
      currentData = allData.filter((record: any) => record[column] !== value);
    } else {
      currentData = [];
    }
    return createFilteredChain();
  });

  const gt = vi.fn((column: string, value: any) => {
    currentFilter = { column, value, operator: 'gt' };
    const allData = getMockData(table);
    if (allData) {
      currentData = allData.filter((record: any) => record[column] > value);
    } else {
      currentData = [];
    }
    return createFilteredChain();
  });

  const gte = vi.fn((column: string, value: any) => {
    currentFilter = { column, value, operator: 'gte' };
    const allData = getMockData(table);
    if (allData) {
      currentData = allData.filter((record: any) => record[column] >= value);
    } else {
      currentData = [];
    }
    return createFilteredChain();
  });

  const lt = vi.fn((column: string, value: any) => {
    currentFilter = { column, value, operator: 'lt' };
    const allData = getMockData(table);
    if (allData) {
      currentData = allData.filter((record: any) => record[column] < value);
    } else {
      currentData = [];
    }
    return createFilteredChain();
  });

  const lte = vi.fn((column: string, value: any) => {
    currentFilter = { column, value, operator: 'lte' };
    const allData = getMockData(table);
    if (allData) {
      currentData = allData.filter((record: any) => record[column] <= value);
    } else {
      currentData = [];
    }
    return createFilteredChain();
  });

  // Create chainable object that filter methods return
  const createFilteredChain = () => ({
    eq,
    neq,
    gt,
    gte,
    lt,
    lte,
    like,
    ilike,
    is,
    in: inArray,
    contains,
    order,
    limit,
    range,
    single,
    maybeSingle,
    then: async (resolve: any) => {
      const data = resolveData();
      return resolve({ data, error: null });
    },
  });

  const select = vi.fn(() => {
    // Reset filter state when select is called
    currentFilter = null;
    currentData = null;
    return createFilteredChain();
  });

  const insert = vi.fn().mockReturnValue({
    select: insertReturn,
    then: async (resolve: any) => resolve({ data: null, error: null }),
  });

  const update = vi.fn().mockReturnValue({
    eq,
    select: updateReturn,
    then: async (resolve: any) => resolve({ data: null, error: null }),
  });

  const deleteFn = vi.fn().mockReturnValue({
    eq,
    select: deleteReturn,
    then: async (resolve: any) => resolve({ data: null, error: null }),
  });

  return {
    select,
    insert,
    update,
    delete: deleteFn,
    eq,
    neq,
    gt,
    gte,
    lt,
    lte,
    like,
    ilike,
    is,
    in: inArray,
    contains,
    order,
    limit,
    range,
    single,
    maybeSingle,
    selectReturn,
    insertReturn,
    updateReturn,
    deleteReturn,
  };
}

/**
 * Helper to create a query builder chain mock
 * For backward compatibility - use createQueryBuilderWithStorage for storage integration
 */
export function createQueryBuilderMock<T = any>(mockData: T | null = null, error: Error | null = null) {
  const select = vi.fn().mockReturnThis();
  const insert = vi.fn().mockReturnThis();
  const update = vi.fn().mockReturnThis();
  const deleteFn = vi.fn().mockReturnThis();
  const eq = vi.fn().mockReturnThis();
  const neq = vi.fn().mockReturnThis();
  const gt = vi.fn().mockReturnThis();
  const gte = vi.fn().mockReturnThis();
  const lt = vi.fn().mockReturnThis();
  const lte = vi.fn().mockReturnThis();
  const like = vi.fn().mockReturnThis();
  const ilike = vi.fn().mockReturnThis();
  const is = vi.fn().mockReturnThis();
  const inArray = vi.fn().mockReturnThis();
  const contains = vi.fn().mockReturnThis();
  const order = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();
  const range = vi.fn().mockReturnThis();
  const single = vi.fn().mockResolvedValue({ data: mockData, error });
  const maybeSingle = vi.fn().mockResolvedValue({ data: mockData, error });
  const selectReturn = vi.fn().mockResolvedValue({ data: mockData, error });
  const insertReturn = vi.fn().mockResolvedValue({ data: mockData, error });
  const updateReturn = vi.fn().mockResolvedValue({ data: mockData, error });
  const deleteReturn = vi.fn().mockResolvedValue({ data: mockData, error });

  // Chain methods
  select.mockReturnValue({
    eq,
    neq,
    gt,
    gte,
    lt,
    lte,
    like,
    ilike,
    is,
    in: inArray,
    contains,
    order,
    limit,
    range,
    single,
    maybeSingle,
    then: (resolve: any) => resolve({ data: mockData, error }),
  });

  insert.mockReturnValue({
    select: insertReturn,
    then: (resolve: any) => resolve({ data: mockData, error }),
  });

  update.mockReturnValue({
    eq,
    select: updateReturn,
    then: (resolve: any) => resolve({ data: mockData, error }),
  });

  deleteFn.mockReturnValue({
    eq,
    select: deleteReturn,
    then: (resolve: any) => resolve({ data: mockData, error }),
  });

  return {
    select,
    insert,
    update,
    delete: deleteFn,
    eq,
    neq,
    gt,
    gte,
    lt,
    lte,
    like,
    ilike,
    is,
    in: inArray,
    contains,
    order,
    limit,
    range,
    single,
    maybeSingle,
    selectReturn,
    insertReturn,
    updateReturn,
    deleteReturn,
  };
}

/**
 * Mock user session for auth tests
 */
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  phone: '+1234567890',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};
