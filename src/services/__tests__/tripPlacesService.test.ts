import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTripPlaces } from '../tripPlacesService';
import { supabase } from '@/integrations/supabase/client';
import * as cacheModule from '@/offline/cache';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/offline/cache', () => ({
  getCachedEntity: vi.fn(),
  cacheEntity: vi.fn(),
}));

describe('tripPlacesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (cacheModule.getCachedEntity as any).mockResolvedValue(null);
  });

  it('correctly parses well-formed og_description', async () => {
    const mockData = [
      {
        id: 'test-id-1',
        url: 'https://maps.google.com',
        og_title: 'Central Park',
        og_description: 'category:Attraction | coords:40.785091,-73.968285 | place_id:ChIJ4zGFAZpYwokRGUGph3Mf37k | Saved from Places: New York, NY 10024',
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    const places = await fetchTripPlaces('trip-123', false);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      id: 'ChIJ4zGFAZpYwokRGUGph3Mf37k',
      name: 'Central Park',
      address: 'New York, NY 10024',
      coordinates: { lat: 40.785091, lng: -73.968285 },
      category: 'Attraction',
      url: 'https://maps.google.com',
    });
  });

  it('handles malformed coordinates without crashing', async () => {
    const mockData = [
      {
        id: 'test-id-2',
        url: 'https://maps.google.com',
        og_title: 'Bad Coords Park',
        og_description: 'category:Attraction | coords:not-a-number,bad | place_id:ChIJ-abc | Saved from Places: New York',
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    const places = await fetchTripPlaces('trip-123', false);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      id: 'ChIJ-abc',
      name: 'Bad Coords Park',
      address: 'New York',
      coordinates: undefined, // Should be undefined due to isNaN check
      category: 'Attraction',
    });
  });

  it('handles missing or empty og_description gracefully', async () => {
    const mockData = [
      {
        id: 'test-id-3',
        url: 'https://example.com',
        og_title: 'Empty Desc Place',
        og_description: null,
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 'test-id-4',
        url: 'https://example.com',
        og_title: 'Random Text Place',
        og_description: 'Just some random text with no format',
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    const places = await fetchTripPlaces('trip-123', false);

    expect(places).toHaveLength(2);

    // Test null description
    expect(places[0]).toMatchObject({
      id: 'test-id-3', // Falls back to link ID
      name: 'Empty Desc Place',
      address: '',
      coordinates: undefined,
      category: 'other',
    });

    // Test random text description
    expect(places[1]).toMatchObject({
      id: 'test-id-4',
      name: 'Random Text Place',
      address: '',
      coordinates: undefined,
      category: 'other',
    });
  });
});
