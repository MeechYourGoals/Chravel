import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Deno.env before importing cors module
const envMap = new Map<string, string>();
vi.stubGlobal('Deno', {
  env: { get: (key: string) => envMap.get(key) ?? '' },
});

describe('CORS Security Tests', () => {
  beforeEach(() => {
    vi.resetModules();
    envMap.clear();
  });

  async function getIsOriginAllowed() {
    const mod = await import('../cors.ts');
    return mod.isOriginAllowed;
  }

  async function getGetCorsHeaders() {
    const mod = await import('../cors.ts');
    return mod.getCorsHeaders;
  }

  describe('Production origins', () => {
    it('should allow chravel.app', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://chravel.app')).toBe(true);
    });

    it('should allow www.chravel.app', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://www.chravel.app')).toBe(true);
    });

    it('should allow the specific Supabase project origin', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://jmjiyekmxwsxkfnqwyaa.supabase.co')).toBe(true);
    });
  });

  describe('Wildcard subdomain rejection', () => {
    it('should reject random *.vercel.app origins', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://evil-site.vercel.app')).toBe(false);
    });

    it('should reject random *.lovable.app origins', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://malicious.lovable.app')).toBe(false);
    });

    it('should reject random *.supabase.co origins', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://attacker-project.supabase.co')).toBe(false);
    });

    it('should reject attacker-controlled domains', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://evil.com')).toBe(false);
    });
  });

  describe('Localhost allowed for development', () => {
    it('should allow localhost:5173', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    });

    it('should allow 127.0.0.1:5173', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
    });
  });

  describe('Null/empty origin handling', () => {
    it('should reject null origin', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed(null)).toBe(false);
    });

    it('should reject empty string origin', async () => {
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('')).toBe(false);
    });
  });

  describe('ADDITIONAL_ALLOWED_ORIGINS env var', () => {
    it('should allow origins from env var', async () => {
      envMap.set(
        'ADDITIONAL_ALLOWED_ORIGINS',
        'https://preview-123.vercel.app,https://staging.chravel.app',
      );
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://preview-123.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://staging.chravel.app')).toBe(true);
    });

    it('should still reject non-listed origins even with env var set', async () => {
      envMap.set('ADDITIONAL_ALLOWED_ORIGINS', 'https://preview-123.vercel.app');
      const isOriginAllowed = await getIsOriginAllowed();
      expect(isOriginAllowed('https://other-site.vercel.app')).toBe(false);
    });
  });

  describe('getCorsHeaders', () => {
    it('should return production origin for disallowed request origins', async () => {
      const getCorsHeaders = await getGetCorsHeaders();
      const headers = getCorsHeaders(
        new Request('https://example.com', {
          headers: { origin: 'https://evil.com' },
        }),
      );
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chravel.app');
    });

    it('should echo back allowed origin', async () => {
      const getCorsHeaders = await getGetCorsHeaders();
      const headers = getCorsHeaders(
        new Request('https://example.com', {
          headers: { origin: 'https://chravel.app' },
        }),
      );
      expect(headers['Access-Control-Allow-Origin']).toBe('https://chravel.app');
    });
  });
});
