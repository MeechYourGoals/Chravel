/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';
import { testFactories } from './utils/testHelpers';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// NOTE: Integration tests with complex mock hoisting issues
// Skipped pending proper test infrastructure overhaul
describe.skip('Chat Message Send → Receive Flow', () => {
  beforeEach(() => {
    supabaseMockHelpers.clearMocks();
  });

  it('should send a message successfully', async () => {
    const trip = testFactories.createTrip();
    const user = testFactories.createUser();
    const message = testFactories.createMessage({
      trip_id: trip.id,
      created_by: user.id,
      content: 'Hello everyone!',
    });

    // Mock message insertion
    supabaseMockHelpers.setMockData('trip_messages', [message]);

    const TestComponent = () => {
      const [messages, setMessages] = React.useState<any[]>([]);
      const [status, setStatus] = React.useState('idle');

      const handleSendMessage = async () => {
        setStatus('loading');
        try {
          const { data, error } = await mockSupabase
            .from('trip_messages')
            .insert({
              trip_id: trip.id,
              content: 'Hello everyone!',
              created_by: user.id,
              message_type: 'message',
            })
            .select()
            .single();

          if (error) throw error;
          setMessages([...messages, data]);
          setStatus('success');
        } catch {
          setStatus('error');
        }
      };

      return (
        <div>
          <button onClick={handleSendMessage}>Send Message</button>
          <div data-testid="status">{status}</div>
          {messages.length > 0 && <div data-testid="message-content">{messages[0].content}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    const sendButton = screen.getByText('Send Message');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('success');
      expect(screen.getByTestId('message-content')).toHaveTextContent('Hello everyone!');
    });
  });

  it('should receive messages in real-time', async () => {
    const trip = testFactories.createTrip();
    const initialMessages = [
      testFactories.createMessage({ id: 'msg-1', content: 'First message' }),
      testFactories.createMessage({ id: 'msg-2', content: 'Second message' }),
    ];

    supabaseMockHelpers.setMockData('trip_messages', initialMessages);

    const TestComponent = () => {
      const [messages, setMessages] = React.useState<any[]>([]);

      React.useEffect(() => {
        const loadMessages = async () => {
          const { data } = await mockSupabase
            .from('trip_messages')
            .select('*')
            .eq('trip_id', trip.id)
            .order('created_at', { ascending: true });

          if (data) {
            setMessages(data);
          }
        };

        loadMessages();
      }, []);

      return (
        <div>
          <div data-testid="message-count">{messages.length}</div>
          {messages.map(msg => (
            <div key={msg.id} data-testid={`message-${msg.id}`}>
              {msg.content}
            </div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('message-count')).toHaveTextContent('2');
      expect(screen.getByTestId('message-msg-1')).toHaveTextContent('First message');
      expect(screen.getByTestId('message-msg-2')).toHaveTextContent('Second message');
    });
  });

  it('should handle message send errors gracefully', async () => {
    const trip = testFactories.createTrip();
    const error = { message: 'Failed to send message', code: 'NETWORK_ERROR' };

    supabaseMockHelpers.setMockError('trip_messages', error as any);

    const TestComponent = () => {
      const [error, setError] = React.useState<string | null>(null);

      const handleSendMessage = async () => {
        try {
          const { error: insertError } = await mockSupabase.from('trip_messages').insert({
            trip_id: trip.id,
            content: 'Test message',
            created_by: 'test-user-123',
          });

          if (insertError) {
            setError(insertError.message);
          }
        } catch (err: any) {
          setError(err.message);
        }
      };

      return (
        <div>
          <button onClick={handleSendMessage}>Send Message</button>
          {error && <div data-testid="error">{error}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    const sendButton = screen.getByText('Send Message');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });

  it('should support message reactions', async () => {
    const message = testFactories.createMessage();
    const reaction = {
      id: 'reaction-1',
      message_id: message.id,
      user_id: 'test-user-123',
      emoji: '👍',
    };

    supabaseMockHelpers.setMockData('message_reactions', [reaction]);

    const TestComponent = () => {
      const [reactions, setReactions] = React.useState<any[]>([]);

      const handleAddReaction = async () => {
        const { data } = await mockSupabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', message.id);

        if (data) {
          setReactions(data);
        }
      };

      return (
        <div>
          <button onClick={handleAddReaction}>Add Reaction</button>
          {reactions.length > 0 && <div data-testid="reaction-emoji">{reactions[0].emoji}</div>}
        </div>
      );
    };

    render(<TestComponent />);

    const addButton = screen.getByText('Add Reaction');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('reaction-emoji')).toHaveTextContent('👍');
    });
  });
});
