import { describe, expect, it } from 'vitest';
import { validateImportUrl } from '../importUrlValidation';

describe('validateImportUrl', () => {
  it('returns invalid with no error for empty input', () => {
    expect(validateImportUrl('   ')).toEqual({
      normalizedUrl: '',
      isValid: false,
      error: null,
    });
  });

  it('accepts and preserves http/https URLs', () => {
    expect(validateImportUrl('https://example.com/schedule').isValid).toBe(true);
    expect(validateImportUrl('http://example.com/schedule').isValid).toBe(true);
  });

  it('normalizes URLs missing protocol to https', () => {
    const result = validateImportUrl('example.com/schedule');
    expect(result.isValid).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/schedule');
  });

  it('rejects non-http schemes', () => {
    const result = validateImportUrl('ftp://example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Use an http:// or https:// URL.');
  });

  it('rejects malformed URL strings', () => {
    const result = validateImportUrl('not a real url');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Enter a valid website URL.');
  });
});
