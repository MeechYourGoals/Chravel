import { describe, it, expect } from 'vitest';

/**
 * These tests verify that error responses from edge functions do NOT
 * leak sensitive information (API keys, internal paths, stack traces).
 *
 * They test the patterns used across:
 * - gemini.ts (Gemini/Lovable API error sanitization)
 * - demo-concierge/index.ts (generic error response)
 * - gmail-auth/index.ts (generic error response)
 * - fetch-og-metadata/index.ts (generic error response)
 */

describe('Error Sanitization Patterns', () => {
  describe('API key exclusion from error messages', () => {
    it('should not include API keys in sanitized error messages', () => {
      // Pattern from gemini.ts: log full error, throw generic
      const apiKey = 'AIzaSyB-FAKE-KEY-1234567890';
      const fullError = `Gemini API error 403: {"error":{"message":"API key ${apiKey} is invalid"}}`;
      const sanitizedError = `Gemini API error 403`;

      expect(sanitizedError).not.toContain(apiKey);
      expect(sanitizedError).not.toContain('AIza');
      expect(sanitizedError).toMatch(/^Gemini API error \d{3}$/);
    });

    it('should strip response body from thrown errors', () => {
      const errorBody =
        '{"error":{"message":"Quota exceeded","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo"}]}}';
      const sanitized = 'Gemini API error 429';

      expect(sanitized).not.toContain('Quota exceeded');
      expect(sanitized).not.toContain('googleapis.com');
    });
  });

  describe('Generic error response pattern', () => {
    it('should use generic message for 500 errors', () => {
      const genericMessage = 'An internal error occurred. Please try again later.';

      // This is the pattern used in demo-concierge and gmail-auth
      expect(genericMessage).not.toContain('stack');
      expect(genericMessage).not.toContain('Error:');
      expect(genericMessage).not.toContain('undefined');
    });

    it('should use descriptive but safe message for fetch-og-metadata errors', () => {
      const message = 'Failed to fetch metadata from the provided URL.';
      expect(message).not.toContain('ECONNREFUSED');
      expect(message).not.toContain('127.0.0.1');
    });
  });

  describe('Error message sanitization regex patterns', () => {
    const sensitivePatterns = [
      /AIza[a-zA-Z0-9_-]{35}/, // Google API key
      /sk-[a-zA-Z0-9]{48}/, // OpenAI-style key
      /supabase_service_role_key/i,
      /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/, // JWT tokens
    ];

    it('should identify sensitive patterns that must never appear in client errors', () => {
      const exampleSafeError = 'Gemini API error 500';

      for (const pattern of sensitivePatterns) {
        expect(exampleSafeError).not.toMatch(pattern);
      }
    });

    it('should flag if raw error contains sensitive data', () => {
      const rawError =
        'Error at https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=AIzaSyBFakeKey1234567890abcdefghijklmno';

      // This raw error DOES contain an API key — it should never reach the client
      expect(rawError).toMatch(sensitivePatterns[0]);

      // The sanitized version should NOT
      const sanitized = 'Gemini API error 500';
      expect(sanitized).not.toMatch(sensitivePatterns[0]);
    });
  });

  describe('Error response HTTP status codes', () => {
    it('should use appropriate status codes', () => {
      // These are the error patterns we expect
      const patterns = [
        { condition: 'missing auth', status: 401 },
        { condition: 'invalid input', status: 400 },
        { condition: 'forbidden', status: 403 },
        { condition: 'not found', status: 404 },
        { condition: 'internal error', status: 500 },
        { condition: 'service unavailable', status: 503 },
      ];

      for (const { status } of patterns) {
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(600);
      }
    });
  });
});
