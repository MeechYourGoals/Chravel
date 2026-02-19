import { describe, expect, it } from 'vitest';
import { normalizeAndValidateUrl } from '../tripLinksService';

describe('tripLinksService URL normalization', () => {
  it('normalizes valid URLs and adds https when missing', () => {
    expect(normalizeAndValidateUrl('example.com')).toBe('https://example.com/');
    expect(normalizeAndValidateUrl('https://chravel.app/places')).toBe(
      'https://chravel.app/places',
    );
  });

  it('rejects unsafe or invalid URLs', () => {
    expect(normalizeAndValidateUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeAndValidateUrl('')).toBeNull();
    expect(normalizeAndValidateUrl('not a valid url')).toBeNull();
  });
});
