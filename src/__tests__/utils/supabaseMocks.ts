import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a comprehensive mock Supabase client for testing
 * Supports chaining: .from().select().eq().single() etc.
 */
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {};
  const mockErrors: Record<string, Error | null> = {};

  // Helper to build query chain
  const createQueryBuilder = (table: string) => {
    let query = {
      select: vi.fn((columns?: string) => {
        return {
          eq: vi.fn((column: string, value: any) => {
            return {
              single: vi.fn(() => {
                const key = `${table}:${column}:${value}`;
                const data = mockData[key]?.[0] || null;
                const error = mockErrors[key] || null;
                return Promise.resolve({ data, error });
              }),
              order: vi.fn((column: string, options?: { ascending?: boolean }) => {
                return {
                  limit: vi.fn((count: number) => {
                    const key = `${table}:${column}:${value}`;
                    const data = mockData[key]?.slice(0, count) || [];
                    const error = mockErrors[key] || null;
                    return Promise.resolve({ data, error });
                  }),
                };
              }),
              in: vi.fn((column: string, values: any[]) => {
                return {
                  select: vi.fn(() => {
                    const key = `${table}:${column}:${values.join(',')}`;
                    const data = mockData[key] || [];
                    const error = mockErrors[key] || null;
                    return Promise.resolve({ data, error });
                  }),
                };
              }),
            };
          }),
          insert: vi.fn((values: any) => {
            return {
              select: vi.fn(() => {
                const inserted = Array.isArray(values) ? values : [values];
                const key = `${table}:insert`;
                mockData[key] = inserted;
                return Promise.resolve({ data: inserted, error: null });
              }),
              single: vi.fn(() => {
                const inserted = Array.isArray(values) ? values[0] : values;
                const key = `${table}:insert`;
                mockData[key] = [inserted];
                return Promise.resolve({ data: inserted, error: null });
              }),
            };
          }),
          update: vi.fn((values: any) => {
            return {
              eq: vi.fn((column: string, value: any) => {
                const key = `${table}:${column}:${value}`;
                if (mockData[key]) {
                  mockData[key] = mockData[key].map((item) => ({ ...item, ...values }));
                }
                return Promise.resolve({ data: mockData[key] || [], error: null });
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
     */
    setMockData(table: string, data: any[], filter?: { column: string; value: any }) {
      const key = filter ? `${table}:${filter.column}:${filter.value}` : `${table}:all`;
      mockData[key] = data;
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
