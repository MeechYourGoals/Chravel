import { describe, it, expect } from 'vitest';
import { toAppAccommodation, toDbAccommodationInsert } from '../accommodationAdapter';
import type { Database } from '../../../integrations/supabase/types';

type AccommodationRow = Database['public']['Tables']['user_accommodations']['Row'];

const baseRow: AccommodationRow = {
  id: 'acc-1',
  trip_id: 'trip-1',
  user_id: 'user-a',
  accommodation_name: 'Hilton Downtown',
  accommodation_type: 'hotel',
  address: '123 Main St',
  latitude: 34.0522,
  longitude: -118.2437,
  check_in: '2026-03-15T15:00:00Z',
  check_out: '2026-03-18T11:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('accommodationAdapter', () => {
  describe('toAppAccommodation', () => {
    it('maps accommodation_name -> label (high-risk #20)', () => {
      const result = toAppAccommodation(baseRow);
      expect(result.label).toBe('Hilton Downtown');
    });

    it('preserves identity and location fields', () => {
      const result = toAppAccommodation(baseRow);
      expect(result.id).toBe('acc-1');
      expect(result.trip_id).toBe('trip-1');
      expect(result.user_id).toBe('user-a');
      expect(result.address).toBe('123 Main St');
      expect(result.latitude).toBe(34.0522);
      expect(result.longitude).toBe(-118.2437);
    });

    it('defaults null address to empty string', () => {
      const row: AccommodationRow = { ...baseRow, address: null };
      expect(toAppAccommodation(row).address).toBe('');
    });

    it('defaults null lat/lng to undefined', () => {
      const row: AccommodationRow = { ...baseRow, latitude: null, longitude: null };
      const result = toAppAccommodation(row);
      expect(result.latitude).toBeUndefined();
      expect(result.longitude).toBeUndefined();
    });

    it('sets app-only fields to defaults', () => {
      const result = toAppAccommodation(baseRow);
      expect(result.place_id).toBeUndefined();
      expect(result.is_private).toBe(false);
    });
  });

  describe('toDbAccommodationInsert', () => {
    it('maps label -> accommodation_name', () => {
      const result = toDbAccommodationInsert('trip-1', 'user-a', {
        label: 'My Hotel',
        address: '456 Oak Ave',
      });
      expect(result.accommodation_name).toBe('My Hotel');
      expect(result.address).toBe('456 Oak Ave');
    });

    it('falls back to address when label is undefined', () => {
      const result = toDbAccommodationInsert('trip-1', 'user-a', {
        address: '789 Pine St',
      });
      expect(result.accommodation_name).toBe('789 Pine St');
    });

    it('defaults null lat/lng', () => {
      const result = toDbAccommodationInsert('trip-1', 'user-a', {
        address: '123 Main St',
      });
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });
});
