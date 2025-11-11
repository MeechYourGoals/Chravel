/**
 * Tests for Google Places Cache Service
 * 
 * Tests Supabase caching layer for Google Places API responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCacheKey,
  getCachedPlace,
  setCachedPlace,
  recordApiUsage,
} from '../googlePlacesCache';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('googlePlacesCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for same inputs', () => {
      const key1 = generateCacheKey('text-search', 'coffee shop', { lat: 40.7128, lng: -74.006 });
      const key2 = generateCacheKey('text-search', 'coffee shop', { lat: 40.7128, lng: -74.006 });
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const key1 = generateCacheKey('text-search', 'coffee shop', null);
      const key2 = generateCacheKey('text-search', 'restaurant', null);
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different origins', () => {
      const key1 = generateCacheKey('text-search', 'coffee', { lat: 40.7128, lng: -74.006 });
      const key2 = generateCacheKey('text-search', 'coffee', { lat: 34.0522, lng: -118.2437 });
      
      expect(key1).not.toBe(key2);
    });

    it('should include additional params in cache key', () => {
      const key1 = generateCacheKey('text-search', 'coffee', null, { maxResults: 5 });
      const key2 = generateCacheKey('text-search', 'coffee', null, { maxResults: 10 });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('getCachedPlace', () => {
    it('should return cached data when available', async () => {
      const mockData = { place_id: '123', name: 'Test Place' };
      (supabase.rpc as any).mockResolvedValue({ data: mockData, error: null });

      const result = await getCachedPlace('test-key');

      expect(result).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('get_places_cache', {
        p_cache_key: 'test-key',
      });
    });

    it('should return null when cache miss', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

      const result = await getCachedPlace('test-key');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await getCachedPlace('test-key');

      expect(result).toBeNull();
    });
  });

  describe('setCachedPlace', () => {
    it('should store cache entry', async () => {
      const mockData = { place_id: '123', name: 'Test Place' };
      (supabase.rpc as any).mockResolvedValue({ error: null });

      await setCachedPlace('test-key', 'text-search', 'coffee', mockData, '123', null);

      expect(supabase.rpc).toHaveBeenCalledWith('set_places_cache', {
        p_cache_key: 'test-key',
        p_query_text: 'coffee',
        p_api_endpoint: 'text-search',
        p_response_data: mockData,
        p_place_id: '123',
        p_origin_lat: null,
        p_origin_lng: null,
      });
    });

    it('should not throw on error', async () => {
      (supabase.rpc as any).mockResolvedValue({ error: { message: 'Error' } });

      await expect(
        setCachedPlace('test-key', 'text-search', 'coffee', {}, undefined, null)
      ).resolves.not.toThrow();
    });
  });

  describe('recordApiUsage', () => {
    it('should record API usage', async () => {
      (supabase.rpc as any).mockResolvedValue({ error: null });

      await recordApiUsage('text-search', 'user-123');

      expect(supabase.rpc).toHaveBeenCalledWith('record_api_usage', {
        p_api_endpoint: 'text-search',
        p_user_id: 'user-123',
        p_estimated_cost_usd: 0.017,
      });
    });

    it('should not throw on error', async () => {
      (supabase.rpc as any).mockResolvedValue({ error: { message: 'Error' } });

      await expect(recordApiUsage('text-search')).resolves.not.toThrow();
    });
  });
});
