/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DistanceCalculator } from '../distanceCalculator';
import { GoogleMapsService } from '@/services/googleMapsService';
import { BasecampLocation, PlaceWithDistance } from '@/types/basecamp';

// Mock GoogleMapsService
vi.mock('@/services/googleMapsService', () => ({
  GoogleMapsService: {
    getDistanceMatrix: vi.fn(),
    geocodeAddress: vi.fn(),
  },
}));

describe('DistanceCalculator', () => {
  const mockBasecamp: BasecampLocation = {
    name: 'Test Basecamp',
    address: '123 Main St',
    coordinates: { lat: 40.758, lng: -73.9855 },
    type: 'other',
  };

  const mockPlace: PlaceWithDistance = {
    id: 'place1',
    name: 'Test Place',
    address: '456 Broadway',
    coordinates: { lat: 40.7614, lng: -73.9776 },
    category: 'restaurant',
    rating: 4.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache
    (DistanceCalculator as any).cache.clear();
  });

  describe('Straight Line Distance', () => {
    it('should calculate straight line distance between two coordinates', async () => {
      const settings = {
        preferredMode: 'straightLine' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // Should be less than 1 mile for NYC coordinates
    });

    it('should return null if place has no coordinates', async () => {
      const placeWithoutCoords: PlaceWithDistance = {
        ...mockPlace,
        coordinates: undefined,
        address: '',
      };

      const settings = {
        preferredMode: 'straightLine' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        placeWithoutCoords,
        settings,
      );

      expect(distance).toBeNull();
    });

    it('should return null if basecamp has no coordinates', async () => {
      const basecampWithoutCoords: BasecampLocation = {
        ...mockBasecamp,
        coordinates: undefined,
      };

      const settings = {
        preferredMode: 'straightLine' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        basecampWithoutCoords,
        mockPlace,
        settings,
      );

      expect(distance).toBeNull();
    });
  });

  describe('Route Distance', () => {
    it('should calculate driving distance using Google Maps API', async () => {
      const mockDistanceData = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { text: '0.5 mi', value: 804 },
                duration: { text: '5 mins', value: 300 },
              },
            ],
          },
        ],
      };

      vi.mocked(GoogleMapsService.getDistanceMatrix).mockResolvedValue(mockDistanceData);

      const settings = {
        preferredMode: 'driving' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      expect(distance).toBeCloseTo(0.5, 1);
      // Verify the API was called with correct mode - coordinates may be formatted differently
      expect(GoogleMapsService.getDistanceMatrix).toHaveBeenCalledWith(
        expect.stringContaining('40.758'),
        expect.stringContaining('40.761'),
        'DRIVING',
      );
    });

    it('should calculate walking distance', async () => {
      const mockDistanceData = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { text: '0.3 mi', value: 482 },
                duration: { text: '8 mins', value: 480 },
              },
            ],
          },
        ],
      };

      vi.mocked(GoogleMapsService.getDistanceMatrix).mockResolvedValue(mockDistanceData);

      const settings = {
        preferredMode: 'walking' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      expect(distance).toBeCloseTo(0.3, 1);
      // Verify the API was called with correct mode - coordinates may be formatted differently
      expect(GoogleMapsService.getDistanceMatrix).toHaveBeenCalledWith(
        expect.stringContaining('40.758'),
        expect.stringContaining('40.761'),
        'WALKING',
      );
    });

    it('should use address when coordinates are not available', async () => {
      const placeWithAddress: PlaceWithDistance = {
        ...mockPlace,
        coordinates: undefined,
        address: '456 Broadway, New York, NY',
      };

      const mockDistanceData = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { text: '0.5 mi', value: 804 },
                duration: { text: '5 mins', value: 300 },
              },
            ],
          },
        ],
      };

      vi.mocked(GoogleMapsService.getDistanceMatrix).mockResolvedValue(mockDistanceData);

      const settings = {
        preferredMode: 'driving' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        placeWithAddress,
        settings,
      );

      expect(distance).toBeCloseTo(0.5, 1);
      // Verify the API was called with address - may be URL encoded
      expect(GoogleMapsService.getDistanceMatrix).toHaveBeenCalledWith(
        expect.stringContaining('40.758'),
        expect.stringMatching(/456.*Broadway/),
        'DRIVING',
      );
    });

    it('should return null on API error', async () => {
      vi.mocked(GoogleMapsService.getDistanceMatrix).mockRejectedValue(new Error('API Error'));

      const settings = {
        preferredMode: 'driving' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      expect(distance).toBeNull();
    });

    it('should cache results', async () => {
      const mockDistanceData = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { text: '0.5 mi', value: 804 },
                duration: { text: '5 mins', value: 300 },
              },
            ],
          },
        ],
      };

      vi.mocked(GoogleMapsService.getDistanceMatrix).mockResolvedValue(mockDistanceData);

      const settings = {
        preferredMode: 'driving' as const,
        unit: 'miles' as const,
        showDistances: true,
      };

      // First call
      const distance1 = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      // Second call should use cache
      const distance2 = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      expect(distance1).toBe(distance2);
      // Should only call API once due to caching
      expect(GoogleMapsService.getDistanceMatrix).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unit Conversion', () => {
    it('should convert miles to kilometers', async () => {
      const mockDistanceData = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { text: '1.0 mi', value: 1609 },
                duration: { text: '10 mins', value: 600 },
              },
            ],
          },
        ],
      };

      vi.mocked(GoogleMapsService.getDistanceMatrix).mockResolvedValue(mockDistanceData);

      const settings = {
        preferredMode: 'driving' as const,
        unit: 'km' as const,
        showDistances: true,
      };

      const distance = await DistanceCalculator.calculateDistance(
        mockBasecamp,
        mockPlace,
        settings,
      );

      // 1 mile = 1.60934 km
      expect(distance).toBeCloseTo(1.60934, 2);
    });
  });

  describe('Geocode Address', () => {
    it('should geocode an address to coordinates', async () => {
      const mockGeocodeResult = {
        lat: 40.758,
        lng: -73.9855,
      };

      vi.mocked(GoogleMapsService.geocodeAddress).mockResolvedValue(mockGeocodeResult);

      const result = await DistanceCalculator.geocodeAddress('123 Main St, New York, NY');

      expect(result).toEqual(mockGeocodeResult);
      expect(GoogleMapsService.geocodeAddress).toHaveBeenCalledWith('123 Main St, New York, NY');
    });

    it('should return null on geocoding error', async () => {
      vi.mocked(GoogleMapsService.geocodeAddress).mockRejectedValue(new Error('Geocoding failed'));

      const result = await DistanceCalculator.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });
  });
});
