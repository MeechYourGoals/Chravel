/**
 * Tests for OpenStreetMap Fallback Service
 * 
 * Tests OSM fallback when Google Maps API is unavailable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchPlacesOSM,
  geocodeAddressOSM,
  convertOSMToGoogleFormat,
  shouldUseOSMFallback,
} from '../openStreetMapFallback';

// Mock fetch
global.fetch = vi.fn();

describe('openStreetMapFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchPlacesOSM', () => {
    it('should search for places using OSM', async () => {
      const mockResponse = [
        {
          place_id: 123,
          name: 'Test Place',
          display_name: 'Test Place, City',
          lat: '40.7128',
          lon: '-74.0060',
          type: 'restaurant',
          importance: 0.5,
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchPlacesOSM('coffee shop', 5);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Place');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const results = await searchPlacesOSM('coffee shop');

      expect(results).toEqual([]);
    });
  });

  describe('geocodeAddressOSM', () => {
    it('should geocode address using OSM', async () => {
      const mockResponse = [
        {
          place_id: 456,
          lat: '40.7128',
          lon: '-74.0060',
          display_name: '123 Main St, New York, NY',
          address: {
            house_number: '123',
            road: 'Main St',
            city: 'New York',
            state: 'NY',
          },
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geocodeAddressOSM('123 Main St, New York');

      expect(result).not.toBeNull();
      expect(result?.lat).toBe('40.7128');
      expect(result?.lon).toBe('-74.0060');
    });

    it('should return null when no results', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await geocodeAddressOSM('invalid address');

      expect(result).toBeNull();
    });
  });

  describe('convertOSMToGoogleFormat', () => {
    it('should convert OSM place to Google format', () => {
      const osmPlace = {
        place_id: 123,
        name: 'Test Place',
        display_name: 'Test Place, City',
        lat: '40.7128',
        lon: '-74.0060',
        type: 'restaurant',
        importance: 0.5,
      };

      // Mock google.maps.LatLng
      global.google = {
        maps: {
          // Use standard function to support 'new'
          LatLng: vi.fn(function(lat, lng) { return { lat, lng }; }),
        } as any,
      };

      const result = convertOSMToGoogleFormat(osmPlace);

      expect(result.place_id).toBe('osm_123');
      expect(result.name).toBe('Test Place');
      expect(result.formatted_address).toBe('Test Place, City');
      expect(result.geometry.location).toBeDefined();
    });
  });

  describe('shouldUseOSMFallback', () => {
    it('should return true for quota errors', () => {
      const error = new Error('API quota exceeded');
      expect(shouldUseOSMFallback(error)).toBe(true);
    });

    it('should return true for OVER_QUERY_LIMIT', () => {
      const error = new Error('OVER_QUERY_LIMIT');
      expect(shouldUseOSMFallback(error)).toBe(true);
    });

    it('should return true for API key errors', () => {
      const error = new Error('Invalid API key');
      expect(shouldUseOSMFallback(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      const error = new Error('Network timeout');
      expect(shouldUseOSMFallback(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('Some other error');
      expect(shouldUseOSMFallback(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(shouldUseOSMFallback('string')).toBe(false);
      expect(shouldUseOSMFallback(null)).toBe(false);
      expect(shouldUseOSMFallback(undefined)).toBe(false);
    });
  });
});
