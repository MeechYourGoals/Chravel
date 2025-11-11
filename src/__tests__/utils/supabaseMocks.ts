import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a comprehensive mock Supabase client for testing
 * Supports chaining: .from().select().eq().single() etc.
 */
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {};
  const mockErrors: Record<string, Error | null> = {};

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

  const getMockError = (table: string, column?: string, value?: any): Error | null => {
    if (column && value !== undefined) {
      const specificKey = `${table}:${column}:${value}`;
      if (mockErrors[specificKey] !== undefined) {
        return mockErrors[specificKey];
      }
    }
    const allKey = `${table}:all`;
    return mockErrors[allKey] || null;
  };

  // Helper to build query chain
  const createQueryBuilder = (table: string) => {
    let query = {
      select: vi.fn((columns?: string) => {
        return {
          eq: vi.fn((column: string, value: any) => {
            return {
              single: vi.fn(() => {
                const data = getMockData(table, column, value);
                const singleItem = Array.isArray(data) ? data[0] || null : data;
                const error = getMockError(table, column, value);
                return Promise.resolve({ data: singleItem, error });
              }),
              order: vi.fn((column: string, options?: { ascending?: boolean }) => {
                return {
                  limit: vi.fn((count: number) => {
                    const data = getMockData(table, column, value);
                    const limitedData = Array.isArray(data) ? data.slice(0, count) : [];
                    const error = getMockError(table, column, value);
                    return Promise.resolve({ data: limitedData, error });
                  }),
                };
              }),
              in: vi.fn((column: string, values: any[]) => {
                return {
                  select: vi.fn(() => {
                    const key = `${table}:${column}:${values.join(',')}`;
                    const data = mockData[key] || getMockData(table) || [];
                    const error = mockErrors[key] || getMockError(table) || null;
                    return Promise.resolve({ data, error });
                  }),
                };
              }),
            };
          }),
          insert: vi.fn((values: any) => {
            const inserted = Array.isArray(values) ? values : [values];
            const insertKey = `${table}:insert`;
            mockData[insertKey] = inserted;
            
            // Create a builder object that supports .select().single() chaining
            const insertBuilder = {
              select: vi.fn(() => {
                // Return a builder object with .single() method
                // This object is NOT a Promise, but has a .single() method
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
            
            return insertBuilder;
          }),
          update: vi.fn((values: any) => {
            return {
              eq: vi.fn((column: string, value: any) => {
                const data = getMockData(table, column, value);
                if (data && Array.isArray(data)) {
                  const updated = data.map((item) => ({ ...item, ...values }));
                  const key = `${table}:${column}:${value}`;
                  mockData[key] = updated;
                  return Promise.resolve({ data: updated, error: null });
                }
                return Promise.resolve({ data: [], error: null });
              }),
            };
          }),
          delete: vi.fn(() => {
            return {
              eq: vi.fn((column: string, value: any) => {
                const key = `${table}:${column}:${value}`;
                delete mockData[key];
                return Promise.resolve({ data: null, error: null });
              }),
            };
          }),
        };
      }),
    };
    return query;
  };

  const mockClient = {
    from: vi.fn((table: string) => createQueryBuilder(table)),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: { url: '', provider: '' }, error: null })),
    },
    rpc: vi.fn((fnName: string, params?: any) => {
      const key = `rpc:${fnName}`;
      const data = mockData[key] || null;
      const error = mockErrors[key] || null;
      return Promise.resolve({ data, error });
    }),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  } as unknown as SupabaseClient;

  // Helper methods for test setup
  const mockHelpers = {
    /**
     * Set mock data for a query
     * When no filter is provided, data is stored under :all key and will be used
     * as fallback when specific queries don't find matching keys.
     */
    setMockData(table: string, data: any[], filter?: { column: string; value: any }) {
      if (filter) {
        const key = `${table}:${filter.column}:${filter.value}`;
        mockData[key] = data;
      } else {
        // Store under :all key for fallback
        const allKey = `${table}:all`;
        mockData[allKey] = data;
      }
    },

    /**
     * Set mock error for a query
     */
    setMockError(table: string, error: Error, filter?: { column: string; value: any }) {
      const key = filter ? `${table}:${filter.column}:${filter.value}` : `${table}:all`;
      mockErrors[key] = error;
    },

    /**
     * Clear all mocks
     */
    clearMocks() {
      Object.keys(mockData).forEach((key) => delete mockData[key]);
      Object.keys(mockErrors).forEach((key) => delete mockErrors[key]);
    },

    /**
     * Set authenticated user
     */
    setUser(user: { id: string; email?: string } | null) {
      (mockClient.auth.getUser as any).mockResolvedValue({
        data: { user },
        error: null,
      });
    },
  };

  return { mockClient, mockHelpers };
}

/**
 * Default mock Supabase client instance
 */
export const { mockClient: mockSupabase, mockHelpers: supabaseMockHelpers } = createMockSupabaseClient();
