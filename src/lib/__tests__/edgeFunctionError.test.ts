import { describe, expect, it } from 'vitest';
import { extractEdgeFunctionErrorMessage } from '@/lib/edgeFunctionError';

describe('extractEdgeFunctionErrorMessage', () => {
  it('returns specific message from context.json body', async () => {
    const message = await extractEdgeFunctionErrorMessage(
      {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({ error: 'Only organization admins can invite members' }),
        },
      },
      'Failed to send invitation',
    );

    expect(message).toBe('Only organization admins can invite members');
  });

  it('returns fallback for generic non-2xx message when no context body is available', async () => {
    const message = await extractEdgeFunctionErrorMessage(
      {
        message: 'Edge Function returned a non-2xx status code',
      },
      'Failed to send invitation',
    );

    expect(message).toBe('Failed to send invitation');
  });

  it('returns direct error message when it is specific', async () => {
    const message = await extractEdgeFunctionErrorMessage(
      {
        message: 'Network timeout while invoking edge function',
      },
      'Failed to send invitation',
    );

    expect(message).toBe('Network timeout while invoking edge function');
  });
});
