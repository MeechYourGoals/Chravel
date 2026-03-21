import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock, onMock, subscribeMock, channelMock, removeChannelMock } = vi.hoisted(() => {
  const send = vi.fn();
  const on = vi.fn();
  const subscribe = vi.fn();
  const channel = vi.fn(() => ({
    send,
    on,
    subscribe,
  }));
  const removeChannel = vi.fn();

  return {
    sendMock: send,
    onMock: on,
    subscribeMock: subscribe,
    channelMock: channel,
    removeChannelMock: removeChannel,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

import {
  broadcastChannelName,
  broadcastNewMessage,
  subscribeToBroadcast,
} from '@/services/chatBroadcastService';

describe('chatBroadcastService', () => {
  beforeEach(() => {
    sendMock.mockReset();
    onMock.mockReset();
    subscribeMock.mockReset();
    channelMock.mockClear();
    removeChannelMock.mockReset();

    sendMock.mockResolvedValue('ok');
    onMock.mockImplementation(() => ({ subscribe: subscribeMock }));
    subscribeMock.mockReturnValue({ status: 'SUBSCRIBED' });
    removeChannelMock.mockResolvedValue('ok');
  });

  it('builds deterministic broadcast channel names', () => {
    expect(broadcastChannelName('trip-123')).toBe('chat_broadcast:trip-123');
  });

  it('broadcasts with private channel config and cleans up channel', async () => {
    const payload = { id: 'm1', content: 'hello' };

    await broadcastNewMessage('trip-123', payload);

    expect(channelMock).toHaveBeenCalledWith('chat_broadcast:trip-123', {
      config: { private: true },
    });
    expect(sendMock).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'new_message',
      payload,
    });
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('still cleans up sender channel when send fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('network fail'));

    await expect(broadcastNewMessage('trip-123', { id: 'm2' })).resolves.toBeUndefined();

    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('subscribes to private broadcast channel and forwards payloads', () => {
    const onMessage = vi.fn();
    let broadcastHandler: ((payload: { payload?: Record<string, unknown> }) => void) | undefined;

    onMock.mockImplementation((_event, _filter, handler) => {
      broadcastHandler = handler;
      return { subscribe: subscribeMock };
    });

    const channel = subscribeToBroadcast('trip-123', onMessage);

    expect(channelMock).toHaveBeenCalledWith('chat_broadcast:trip-123', {
      config: { private: true },
    });
    expect(channel).toEqual({ status: 'SUBSCRIBED' });

    broadcastHandler?.({ payload: { id: 'm3' } });
    expect(onMessage).toHaveBeenCalledWith({ id: 'm3' });
  });
});
