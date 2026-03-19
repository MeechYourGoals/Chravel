import { describe, expect, it } from 'vitest';
import {
  getOptimisticMessageId,
  removeOptimisticMessageByClientId,
} from '../optimisticMessageUtils';

describe('optimisticMessageUtils', () => {
  it('removes only the failed optimistic message by client id', () => {
    const failedClientMessageId = '11111111-1111-4111-8111-111111111111';
    const otherClientMessageId = '22222222-2222-4222-8222-222222222222';

    const messages = [
      {
        id: getOptimisticMessageId(failedClientMessageId),
        client_message_id: failedClientMessageId,
        content: 'optimistic failed send',
      },
      {
        id: 'server-message-from-other-user',
        content: 'concurrent realtime message',
      },
      {
        id: getOptimisticMessageId(otherClientMessageId),
        client_message_id: otherClientMessageId,
        content: 'another optimistic send',
      },
    ];

    const result = removeOptimisticMessageByClientId(messages, failedClientMessageId);

    expect(result).toHaveLength(2);
    expect(result.find(message => message.id === 'server-message-from-other-user')).toBeTruthy();
    expect(
      result.find(message => message.id === getOptimisticMessageId(otherClientMessageId)),
    ).toBeTruthy();
    expect(
      result.find(message => message.id === getOptimisticMessageId(failedClientMessageId)),
    ).toBeFalsy();
  });

  it('returns original messages when client id is missing', () => {
    const messages = [
      { id: 'a', content: 'existing message' },
      { id: 'b', content: 'another message' },
    ];

    expect(removeOptimisticMessageByClientId(messages)).toEqual(messages);
  });
});
