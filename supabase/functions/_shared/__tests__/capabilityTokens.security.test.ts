import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Deno.env for testing secret handling
const envMap = new Map<string, string>();
const mockEnvGet = vi.fn((key: string) => envMap.get(key));

vi.stubGlobal('Deno', {
  env: { get: mockEnvGet },
});

// Mock jose for JWT operations
vi.mock('https://deno.land/x/jose@v5.2.0/index.ts', () => {
  return {
    SignJWT: class {
      constructor(private payload: any) {}
      setProtectedHeader() {
        return this;
      }
      setIssuedAt() {
        return this;
      }
      setExpirationTime() {
        return this;
      }
      async sign() {
        return 'mock.jwt.token.' + JSON.stringify(this.payload);
      }
    },
    jwtVerify: async (token: string) => {
      if (token === 'expired') throw new Error('jwt expired');
      if (token === 'invalid') throw new Error('JWS signature verification failed');
      const payloadStr = token.split('.').pop();
      if (!payloadStr) throw new Error('invalid format');
      return { payload: JSON.parse(payloadStr) };
    },
  };
});

describe('Capability Tokens — Security Tests', () => {
  describe('Missing JWT_SECRET', () => {
    it('should throw when SUPABASE_JWT_SECRET is not set', async () => {
      envMap.clear(); // No secret set

      // The module throws at import time when JWT_SECRET is missing.
      // Reset modules to re-trigger the top-level guard.
      vi.resetModules();

      await expect(async () => {
        await import('../security/capabilityTokens.ts');
      }).rejects.toThrow(/SUPABASE_JWT_SECRET is required/);
    });
  });

  describe('With valid JWT_SECRET', () => {
    beforeEach(() => {
      vi.resetModules();
      envMap.set('SUPABASE_JWT_SECRET', 'test-secret-at-least-32-chars-long!');
    });

    afterEach(() => {
      envMap.clear();
    });

    it('should generate a valid capability token with correct payload', async () => {
      const { generateCapabilityToken, verifyCapabilityToken } =
        await import('../security/capabilityTokens.ts');

      const payload = {
        user_id: 'user_123',
        trip_id: 'trip_456',
        allowed_tools: ['addToCalendar', 'createTask'],
      };

      const token = await generateCapabilityToken(payload);
      expect(token).toBeTruthy();

      const verified = await verifyCapabilityToken(token);
      expect(verified.user_id).toBe('user_123');
      expect(verified.trip_id).toBe('trip_456');
      expect(verified.allowed_tools).toEqual(['addToCalendar', 'createTask']);
    });

    it('should reject expired tokens', async () => {
      const { verifyCapabilityToken } = await import('../security/capabilityTokens.ts');
      await expect(verifyCapabilityToken('expired')).rejects.toThrow(/expired/i);
    });

    it('should reject tokens with invalid signatures', async () => {
      const { verifyCapabilityToken } = await import('../security/capabilityTokens.ts');
      await expect(verifyCapabilityToken('invalid')).rejects.toThrow(
        /Invalid or expired capability token/,
      );
    });

    it('should support wildcard tool allowlist', async () => {
      const { generateCapabilityToken, verifyCapabilityToken } =
        await import('../security/capabilityTokens.ts');

      const token = await generateCapabilityToken({
        user_id: 'user_1',
        trip_id: 'trip_1',
        allowed_tools: ['*'],
      });

      const verified = await verifyCapabilityToken(token);
      expect(verified.allowed_tools).toEqual(['*']);
    });
  });
});
