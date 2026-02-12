/// <reference types="vitest/globals" />
/**
 * Unit tests for getEffectiveDisplayName / resolveDisplayName (DISPLAY_NAME_FORMULA)
 *
 * Formula:
 *   if (name_preference == 'display' AND display_name non-empty) -> display_name
 *   else if (real_name non-empty) -> real_name
 *   else if (display_name non-empty) -> display_name
 *   else -> fallback (first+last, first, or sentinel)
 */

import {
  getEffectiveDisplayName,
  resolveDisplayName,
  UNRESOLVED_NAME_SENTINEL,
  FORMER_MEMBER_LABEL,
} from '../resolveDisplayName';

describe('getEffectiveDisplayName', () => {
  describe('DISPLAY_NAME_FORMULA combinations', () => {
    it('prefers resolved_display_name when present (DB-computed)', () => {
      expect(
        getEffectiveDisplayName({
          resolved_display_name: 'DB Name',
          real_name: 'Real',
          display_name: 'Display',
          name_preference: 'display',
        }),
      ).toBe('DB Name');
    });

    it('returns display_name when name_preference=display and display_name set', () => {
      expect(
        getEffectiveDisplayName({
          real_name: 'Real Name',
          display_name: 'Tour Manager',
          name_preference: 'display',
        }),
      ).toBe('Tour Manager');
    });

    it('returns real_name when name_preference=real and real_name set', () => {
      expect(
        getEffectiveDisplayName({
          real_name: 'John Smith',
          display_name: 'Tour Manager',
          name_preference: 'real',
        }),
      ).toBe('John Smith');
    });

    it('returns real_name when name_preference=display but display_name empty (fallback)', () => {
      expect(
        getEffectiveDisplayName({
          real_name: 'John Smith',
          display_name: '',
          name_preference: 'display',
        }),
      ).toBe('John Smith');
    });

    it('returns display_name when name_preference=real but real_name empty (fallback)', () => {
      expect(
        getEffectiveDisplayName({
          real_name: '',
          display_name: 'Security',
          name_preference: 'real',
        }),
      ).toBe('Security');
    });

    it('falls back to first_name + last_name when no names set', () => {
      expect(
        getEffectiveDisplayName({
          real_name: null,
          display_name: null,
          first_name: 'Jane',
          last_name: 'Doe',
        }),
      ).toBe('Jane Doe');
    });

    it('falls back to first_name alone when last_name empty', () => {
      expect(
        getEffectiveDisplayName({
          real_name: null,
          display_name: null,
          first_name: 'Jane',
          last_name: '',
        }),
      ).toBe('Jane');
    });

    it('returns fallback when profile is null', () => {
      expect(getEffectiveDisplayName(null)).toBe(UNRESOLVED_NAME_SENTINEL);
      expect(getEffectiveDisplayName(null, 'Member')).toBe('Member');
    });

    it('returns fallback when profile is undefined', () => {
      expect(getEffectiveDisplayName(undefined)).toBe(UNRESOLVED_NAME_SENTINEL);
    });

    it('returns fallback when all name fields empty', () => {
      expect(
        getEffectiveDisplayName({
          real_name: '',
          display_name: '',
          first_name: '',
          last_name: '',
        }),
      ).toBe(UNRESOLVED_NAME_SENTINEL);
    });

    it('defaults name_preference to display when null', () => {
      expect(
        getEffectiveDisplayName({
          real_name: 'Real',
          display_name: 'Display',
          name_preference: null,
        }),
      ).toBe('Display');
    });

    it('trims whitespace from names', () => {
      expect(
        getEffectiveDisplayName({
          display_name: '  Photographer  ',
          name_preference: 'display',
        }),
      ).toBe('Photographer');
    });
  });
});

describe('resolveDisplayName', () => {
  it('delegates to getEffectiveDisplayName', () => {
    expect(resolveDisplayName({ resolved_display_name: 'Test' })).toBe('Test');
    expect(resolveDisplayName(null, FORMER_MEMBER_LABEL)).toBe(FORMER_MEMBER_LABEL);
  });
});
