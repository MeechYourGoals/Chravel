/**
 * Unit tests for URL extraction, normalization, and punctuation stripping.
 *
 * @module services/__tests__/urlUtils.test
 */

import { describe, it, expect } from 'vitest';
import {
  findUrls,
  normalizeUrl,
  getDomain,
  urlsMatch,
  truncateUrl,
  stripTrailingPunctuation,
} from '../urlUtils';

// ---------------------------------------------------------------------------
// stripTrailingPunctuation
// ---------------------------------------------------------------------------
describe('stripTrailingPunctuation', () => {
  it('strips a trailing period', () => {
    expect(stripTrailingPunctuation('https://example.com.')).toBe('https://example.com');
  });

  it('strips a trailing comma', () => {
    expect(stripTrailingPunctuation('https://example.com/page,')).toBe('https://example.com/page');
  });

  it('strips a trailing closing paren', () => {
    expect(stripTrailingPunctuation('https://example.com/page)')).toBe('https://example.com/page');
  });

  it('strips a trailing semicolon', () => {
    expect(stripTrailingPunctuation('https://example.com;')).toBe('https://example.com');
  });

  it('strips multiple trailing punctuation characters', () => {
    expect(stripTrailingPunctuation('https://example.com.).')).toBe('https://example.com');
  });

  it('does not strip periods within the URL path', () => {
    expect(stripTrailingPunctuation('https://example.com/file.html')).toBe(
      'https://example.com/file.html',
    );
  });

  it('returns empty string for empty input', () => {
    expect(stripTrailingPunctuation('')).toBe('');
  });

  it('strips trailing exclamation and question marks', () => {
    expect(stripTrailingPunctuation('https://example.com!')).toBe('https://example.com');
    expect(stripTrailingPunctuation('https://example.com?')).toBe('https://example.com');
  });
});

// ---------------------------------------------------------------------------
// findUrls
// ---------------------------------------------------------------------------
describe('findUrls', () => {
  it('returns empty array for empty/null input', () => {
    expect(findUrls('')).toEqual([]);
    expect(findUrls(null as unknown as string)).toEqual([]);
    expect(findUrls(undefined as unknown as string)).toEqual([]);
  });

  it('extracts a single URL from text', () => {
    const result = findUrls('Check out https://example.com for details');
    expect(result).toEqual(['https://example.com']);
  });

  it('extracts multiple URLs from text', () => {
    const result = findUrls('Visit https://example.com and https://google.com/search');
    expect(result).toHaveLength(2);
    expect(result).toContain('https://example.com');
    expect(result).toContain('https://google.com/search');
  });

  it('auto-prepends https:// for bare domains', () => {
    const result = findUrls('Try example.com for more info');
    expect(result).toEqual(['https://example.com']);
  });

  it('strips trailing punctuation from extracted URLs', () => {
    const result = findUrls('Look at https://example.com/page. It is great!');
    expect(result[0]).toBe('https://example.com/page');
  });

  it('handles URLs with query parameters', () => {
    const result = findUrls('Open https://example.com/page?id=123&ref=chat');
    expect(result[0]).toBe('https://example.com/page?id=123&ref=chat');
  });

  it('extracts URL ending with comma in a sentence', () => {
    const result = findUrls('Try https://example.com, https://test.org, and https://foo.io.');
    expect(result).toEqual(['https://example.com', 'https://test.org', 'https://foo.io']);
  });

  it('handles URLs with paths and fragments', () => {
    const result = findUrls('See https://example.com/docs/guide#section1');
    expect(result[0]).toBe('https://example.com/docs/guide#section1');
  });
});

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------
describe('normalizeUrl', () => {
  it('removes UTM parameters', () => {
    const result = normalizeUrl(
      'https://example.com/page?utm_source=twitter&utm_medium=social&id=5',
    );
    expect(result).toContain('id=5');
    expect(result).not.toContain('utm_source');
    expect(result).not.toContain('utm_medium');
  });

  it('removes fbclid parameter', () => {
    const result = normalizeUrl('https://example.com/page?fbclid=abc123&real=param');
    expect(result).not.toContain('fbclid');
    expect(result).toContain('real=param');
  });

  it('removes hash fragments', () => {
    const result = normalizeUrl('https://example.com/page#section');
    expect(result).toBe('https://example.com/page');
  });

  it('removes trailing slashes (except root)', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    // Root path should keep the trailing slash
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('lowercases the hostname', () => {
    const result = normalizeUrl('https://EXAMPLE.COM/Page');
    expect(result).toContain('example.com');
  });

  it('preserves query parameters that are not tracking-related', () => {
    const result = normalizeUrl('https://example.com/search?q=test&lang=en');
    expect(result).toContain('q=test');
    expect(result).toContain('lang=en');
  });

  it('returns input for invalid URLs', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });

  it('deduplicates URLs differing only in tracking params', () => {
    const url1 = 'https://example.com/page?utm_source=twitter';
    const url2 = 'https://example.com/page';
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });
});

// ---------------------------------------------------------------------------
// getDomain
// ---------------------------------------------------------------------------
describe('getDomain', () => {
  it('extracts domain from full URL', () => {
    expect(getDomain('https://www.example.com/page')).toBe('example.com');
  });

  it('strips www prefix', () => {
    expect(getDomain('https://www.google.com')).toBe('google.com');
  });

  it('handles domains without www', () => {
    expect(getDomain('https://api.example.com')).toBe('api.example.com');
  });

  it('returns empty string for invalid input', () => {
    expect(getDomain('not-a-url')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// urlsMatch
// ---------------------------------------------------------------------------
describe('urlsMatch', () => {
  it('matches same URLs', () => {
    expect(urlsMatch('https://example.com', 'https://example.com')).toBe(true);
  });

  it('matches URLs differing only in tracking params', () => {
    expect(
      urlsMatch('https://example.com/page?utm_source=twitter', 'https://example.com/page'),
    ).toBe(true);
  });

  it('matches URLs differing only in trailing slash', () => {
    expect(urlsMatch('https://example.com/page/', 'https://example.com/page')).toBe(true);
  });

  it('does not match different URLs', () => {
    expect(urlsMatch('https://example.com/page1', 'https://example.com/page2')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(urlsMatch('invalid', 'also-invalid')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// truncateUrl
// ---------------------------------------------------------------------------
describe('truncateUrl', () => {
  it('returns short URLs unchanged', () => {
    expect(truncateUrl('https://x.com', 60)).toBe('https://x.com');
  });

  it('truncates long URLs', () => {
    const long =
      'https://example.com/very/long/path/that/exceeds/the/maximum/length/allowed/for/display/purposes';
    const result = truncateUrl(long, 40);
    expect(result.length).toBeLessThanOrEqual(50); // some tolerance for the algorithm
    expect(result).toContain('...');
  });
});
