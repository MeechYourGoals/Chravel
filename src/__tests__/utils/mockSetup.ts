import { vi } from 'vitest';
import { mockSupabase } from './supabaseMocks';

export const googlePlacesMock = {
  loadMaps: vi.fn(),
  autocomplete: vi.fn(),
  resolveQuery: vi.fn(),
  centerMapOnPlace: vi.fn(),
  searchNearby: vi.fn(),
  searchByText: vi.fn(),
  fetchPlaceDetails: vi.fn(),
  generateSessionToken: vi.fn(() => 'mock-session-token'),
  withTimeout: vi.fn((promise: Promise<unknown>) => promise),
};

export const setupTestMocks = () => {
  vi.mock('@/integrations/supabase/client', () => ({
    supabase: mockSupabase,
  }));

  vi.mock('@/services/googlePlacesNew', () => ({
    ...googlePlacesMock,
  }));
};
