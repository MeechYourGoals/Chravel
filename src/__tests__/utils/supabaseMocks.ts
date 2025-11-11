import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * Creates a mock Supabase client for testing
 * Provides a fluent API builder pattern matching Supabase's query builder
 */
export function createMockSupabaseClient(): SupabaseClient<Database> {
  const mockFrom = vi.fn();
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
 * Helper to create a query builder chain mock
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
