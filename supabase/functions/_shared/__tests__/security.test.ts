import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as functionExecutor from '../functionExecutor.ts';

// Mock jose properly for esm module
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
      if (token === 'expired') throw new Error('expired');
      const payloadStr = token.split('.').pop();
      if (!payloadStr) throw new Error('invalid format');
      return {
        payload: JSON.parse(payloadStr),
      };
    },
  };
});

// Mock functionExecutor to prevent real DB/API calls
vi.mock('../functionExecutor.ts', () => ({
  executeFunctionCall: vi.fn(),
}));

import { generateCapabilityToken, verifyCapabilityToken } from '../security/capabilityTokens.ts';
import { executeToolSecurely } from '../security/toolRouter.ts';

describe('Capability Tokens', () => {
  it('should generate and verify a valid capability token', async () => {
    const payload = {
      user_id: 'user_1',
      trip_id: 'trip_1',
      allowed_tools: ['*'],
    };
    const token = await generateCapabilityToken(payload);
    const verified = await verifyCapabilityToken(token);

    expect(verified.user_id).toBe(payload.user_id);
    expect(verified.trip_id).toBe(payload.trip_id);
    expect(verified.allowed_tools).toEqual(payload.allowed_tools);
  });

  it('should reject an expired token', async () => {
    await expect(verifyCapabilityToken('expired')).rejects.toThrow(/expired/i);
  });
});

describe('Tool Router Security Air-Lock', () => {
  const mockSupabase = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enforce capability trip_id despite LLM args', async () => {
    const token = await generateCapabilityToken({
      user_id: 'user_1',
      trip_id: 'trip_1', // Authorized trip
      allowed_tools: ['*'],
    });

    vi.mocked(functionExecutor.executeFunctionCall).mockResolvedValue({
      success: true,
      task: { id: 't1', creator_id: 'user_1', trip_id: 'trip_1' },
    });

    // LLM maliciously attempts cross-trip access
    const maliciousArgs = {
      title: 'Hack',
      trip_id: 'trip_999',
    };

    const result = await executeToolSecurely(mockSupabase, token, 'createTask', maliciousArgs);

    // The functionExecutor should be called with the AUTHORIZED trip_id
    expect(functionExecutor.executeFunctionCall).toHaveBeenCalledWith(
      mockSupabase,
      'createTask',
      expect.objectContaining({ trip_id: 'trip_1', title: 'Hack' }), // Args were overridden
      'trip_1',
      'user_1',
      undefined,
    );

    // Assert that sensitive fields were redacted from output
    expect(result.task).toBeDefined();
    expect(result.task.creator_id).toBeUndefined(); // Redacted
    expect(result.task.trip_id).toBeUndefined(); // Redacted
  });

  it('should redact emails and phone numbers from user outputs', async () => {
    const token = await generateCapabilityToken({
      user_id: 'user_1',
      trip_id: 'trip_1',
      allowed_tools: ['*'],
    });

    vi.mocked(functionExecutor.executeFunctionCall).mockResolvedValue({
      success: true,
      users: [
        { id: 'u1', display_name: 'Alice', email: 'alice@hacker.com', phone: '123' },
        { id: 'u2', first_name: 'Bob', email: 'bob@hacker.com' },
      ],
    });

    const result = await executeToolSecurely(mockSupabase, token, 'getUsers', {});

    expect(result.users[0].email).toBeUndefined();
    expect(result.users[0].phone).toBeUndefined();
    expect(result.users[0].display_name).toBe('Alice');

    expect(result.users[1].email).toBeUndefined();
    expect(result.users[1].display_name).toBe('Bob');
  });
});
