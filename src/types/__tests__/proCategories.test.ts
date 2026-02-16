import { describe, it, expect } from 'vitest';
import {
  normalizeLegacyCategory,
  getAllCategories,
  PRO_CATEGORIES_ORDERED,
  getCategoryLabel,
} from '../../types/proCategories';
import { filterTrips } from '../../utils/semanticTripFilter';

// ============= Legacy Mapping Tests =============
describe('normalizeLegacyCategory', () => {
  it('maps exact legacy labels to enum values', () => {
    expect(normalizeLegacyCategory('Sports – Pro, Collegiate, Youth')).toBe('sports');
    expect(normalizeLegacyCategory('Tour – Music, Comedy, etc.')).toBe('touring');
    expect(normalizeLegacyCategory('Business Travel')).toBe('work');
    expect(normalizeLegacyCategory('Business Trips')).toBe('work');
    expect(normalizeLegacyCategory('School Trip')).toBe('school');
    expect(normalizeLegacyCategory('Content')).toBe('productions');
    expect(normalizeLegacyCategory('Other')).toBe('other');
  });

  it('passes through already-valid enum values', () => {
    expect(normalizeLegacyCategory('touring')).toBe('touring');
    expect(normalizeLegacyCategory('sports')).toBe('sports');
    expect(normalizeLegacyCategory('celebrations')).toBe('celebrations');
  });

  it('defaults to other for null/undefined/unknown', () => {
    expect(normalizeLegacyCategory(null)).toBe('other');
    expect(normalizeLegacyCategory(undefined)).toBe('other');
    expect(normalizeLegacyCategory('')).toBe('other');
    expect(normalizeLegacyCategory('RandomGarbage')).toBe('other');
  });

  it('handles substring matching for fuzzy legacy data', () => {
    expect(normalizeLegacyCategory('Music Tour 2024')).toBe('touring');
    expect(normalizeLegacyCategory('Corporate Business Meeting')).toBe('work');
    expect(normalizeLegacyCategory('Film Production Crew')).toBe('productions');
    expect(normalizeLegacyCategory('School Education Trip')).toBe('school');
    expect(normalizeLegacyCategory('Wedding Celebration')).toBe('celebrations');
  });
});

// ============= Category Order Tests =============
describe('PRO_CATEGORIES_ORDERED', () => {
  it('has exactly 7 categories in the correct order', () => {
    const ids = PRO_CATEGORIES_ORDERED.map(c => c.id);
    expect(ids).toEqual([
      'touring',
      'sports',
      'work',
      'school',
      'productions',
      'celebrations',
      'other',
    ]);
  });

  it('getAllCategories returns enum values in order', () => {
    const cats = getAllCategories();
    expect(cats[0]).toBe('touring');
    expect(cats[6]).toBe('other');
    expect(cats.length).toBe(7);
  });
});

// ============= Search Synonym Tests =============
describe('filterTrips category synonym search', () => {
  const mockTrips = [
    { id: '1', title: 'Lakers Road Trip', dateRange: 'Jan 1 - Jan 5, 2025', proTripCategory: 'sports' },
    { id: '2', title: 'Beyoncé Tour', dateRange: 'Mar 1 - Mar 5, 2025', proTripCategory: 'touring' },
    { id: '3', title: 'Company Offsite', dateRange: 'Apr 1 - Apr 5, 2025', proTripCategory: 'work' },
    { id: '4', title: 'DC Field Trip', dateRange: 'May 1 - May 5, 2025', proTripCategory: 'school' },
    { id: '5', title: 'ATL Shoot', dateRange: 'Jun 1 - Jun 5, 2025', proTripCategory: 'productions' },
    { id: '6', title: 'Beach Wedding', dateRange: 'Jul 1 - Jul 5, 2025', proTripCategory: 'celebrations' },
  ];

  it('matches "wedding" to celebrations trips', () => {
    const result = filterTrips(mockTrips, 'wedding', '');
    expect(result.some(t => t.id === '6')).toBe(true);
  });

  it('matches "content" to productions trips', () => {
    const result = filterTrips(mockTrips, 'content', '');
    expect(result.some(t => t.id === '5')).toBe(true);
  });

  it('matches "shoot" to productions trips', () => {
    const result = filterTrips(mockTrips, 'shoot', '');
    expect(result.some(t => t.id === '5')).toBe(true);
  });

  it('matches "business" to work trips', () => {
    const result = filterTrips(mockTrips, 'business', '');
    expect(result.some(t => t.id === '3')).toBe(true);
  });

  it('matches "sport" to sports trips', () => {
    const result = filterTrips(mockTrips, 'sport', '');
    expect(result.some(t => t.id === '1')).toBe(true);
  });

  it('matches cat:touring power syntax', () => {
    const result = filterTrips(mockTrips, 'cat:touring', '');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });

  it('matches cat:work power syntax', () => {
    const result = filterTrips(mockTrips, 'cat:work', '');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('3');
  });
});

// ============= Display Label Tests =============
describe('getCategoryLabel', () => {
  it('returns correct display labels', () => {
    expect(getCategoryLabel('touring')).toBe('Touring');
    expect(getCategoryLabel('sports')).toBe('Sports');
    expect(getCategoryLabel('work')).toBe('Work');
    expect(getCategoryLabel('school')).toBe('School');
    expect(getCategoryLabel('productions')).toBe('Productions');
    expect(getCategoryLabel('celebrations')).toBe('Celebrations');
    expect(getCategoryLabel('other')).toBe('Other');
  });

  it('gracefully handles legacy labels', () => {
    expect(getCategoryLabel('Business Travel')).toBe('Work');
    expect(getCategoryLabel('Content')).toBe('Productions');
    expect(getCategoryLabel(undefined)).toBe('Other');
  });
});
