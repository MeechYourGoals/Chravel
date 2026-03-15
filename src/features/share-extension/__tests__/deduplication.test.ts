import { describe, it, expect } from 'vitest';

/**
 * Tests for deduplication logic (TypeScript mirror of Swift DedupeEngine).
 */

function canonicalizeURL(urlString: string): string {
  try {
    const url = new URL(urlString);

    // Lowercase scheme and host
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    // Remove tracking params
    const trackingParams = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'source',
      'mc_cid',
      'mc_eid',
      's',
      'si',
      '_hsenc',
      '_hsmi',
    ]);

    const cleanParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (!trackingParams.has(key.toLowerCase())) {
        cleanParams.set(key, value);
      }
    });

    url.search = cleanParams.toString() ? `?${cleanParams.toString()}` : '';

    // Remove trailing slash
    if (url.pathname.endsWith('/') && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Remove fragment
    url.hash = '';

    return url.toString();
  } catch {
    return urlString.toLowerCase();
  }
}

function generateFingerprint(
  url: string | null,
  text: string | null,
  attachments: Array<{ fileName?: string; fileSize?: number; mimeType?: string }>,
): string {
  const components: string[] = [];

  if (url) {
    components.push('url:' + canonicalizeURL(url));
  }

  if (text) {
    const normalized = text
      .toLowerCase()
      .split(/\s+/)
      .filter(s => s.length > 0)
      .join(' ')
      .substring(0, 500);
    components.push('text:' + normalized);
  }

  for (const attachment of attachments) {
    const parts = ['attach'];
    if (attachment.fileName) parts.push(attachment.fileName.toLowerCase());
    if (attachment.fileSize !== undefined) parts.push(String(attachment.fileSize));
    if (attachment.mimeType) parts.push(attachment.mimeType);
    components.push(parts.join(':'));
  }

  if (components.length === 0) {
    return 'empty';
  }

  // Simple hash for testing (real implementation uses SHA256)
  return components.join('|');
}

describe('URL Canonicalization', () => {
  it('should strip UTM parameters', () => {
    const result = canonicalizeURL(
      'https://example.com/article?utm_source=twitter&utm_medium=social&id=123',
    );
    expect(result).not.toContain('utm_source');
    expect(result).not.toContain('utm_medium');
    expect(result).toContain('id=123');
  });

  it('should strip fbclid', () => {
    const result = canonicalizeURL('https://example.com/page?fbclid=abc123');
    expect(result).not.toContain('fbclid');
  });

  it('should strip gclid', () => {
    const result = canonicalizeURL('https://example.com/page?gclid=xyz789');
    expect(result).not.toContain('gclid');
  });

  it('should lowercase host', () => {
    const result = canonicalizeURL('https://EXAMPLE.COM/Article');
    expect(result).toContain('example.com');
  });

  it('should remove trailing slash', () => {
    const result = canonicalizeURL('https://example.com/article/');
    expect(result).toBe('https://example.com/article');
  });

  it('should remove fragment', () => {
    const result = canonicalizeURL('https://example.com/article#section1');
    expect(result).not.toContain('#section1');
  });

  it('should preserve meaningful query params', () => {
    const result = canonicalizeURL('https://example.com/search?q=travel&page=2');
    expect(result).toContain('q=travel');
    expect(result).toContain('page=2');
  });

  it('should handle URLs without params', () => {
    const result = canonicalizeURL('https://example.com/simple-page');
    expect(result).toBe('https://example.com/simple-page');
  });
});

describe('Fingerprint Generation', () => {
  it('should generate consistent fingerprints for same URL', () => {
    const fp1 = generateFingerprint('https://example.com/article', null, []);
    const fp2 = generateFingerprint('https://example.com/article', null, []);
    expect(fp1).toBe(fp2);
  });

  it('should generate same fingerprint regardless of tracking params', () => {
    const fp1 = generateFingerprint('https://example.com/article', null, []);
    const fp2 = generateFingerprint('https://example.com/article?utm_source=twitter', null, []);
    expect(fp1).toBe(fp2);
  });

  it('should generate different fingerprints for different URLs', () => {
    const fp1 = generateFingerprint('https://example.com/article-1', null, []);
    const fp2 = generateFingerprint('https://example.com/article-2', null, []);
    expect(fp1).not.toBe(fp2);
  });

  it('should include text in fingerprint', () => {
    const fp1 = generateFingerprint(null, 'Hello world', []);
    const fp2 = generateFingerprint(null, 'Different text', []);
    expect(fp1).not.toBe(fp2);
  });

  it('should normalize text whitespace', () => {
    const fp1 = generateFingerprint(null, 'Hello   world', []);
    const fp2 = generateFingerprint(null, 'Hello world', []);
    expect(fp1).toBe(fp2);
  });

  it('should include attachment metadata in fingerprint', () => {
    const fp1 = generateFingerprint(null, null, [
      { fileName: 'photo.jpg', fileSize: 1024, mimeType: 'image/jpeg' },
    ]);
    const fp2 = generateFingerprint(null, null, [
      { fileName: 'different.jpg', fileSize: 2048, mimeType: 'image/jpeg' },
    ]);
    expect(fp1).not.toBe(fp2);
  });

  it('should return "empty" for no content', () => {
    const fp = generateFingerprint(null, null, []);
    expect(fp).toBe('empty');
  });
});
