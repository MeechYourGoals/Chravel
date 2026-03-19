import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BroadcastList } from '../BroadcastList';

const mockUseLinkPreviews = vi.fn();

vi.mock('@/features/chat/hooks/useLinkPreviews', () => ({
  useLinkPreviews: (...args: unknown[]) => mockUseLinkPreviews(...args),
}));

describe('BroadcastList link preview wiring', () => {
  beforeEach(() => {
    mockUseLinkPreviews.mockReset();
  });

  it('passes fetched link preview data into each BroadcastItem', () => {
    mockUseLinkPreviews.mockReturnValue({
      'broadcast-1': {
        url: 'https://example.com',
        title: 'Example title',
        description: 'Example description',
        domain: 'example.com',
      },
    });

    render(
      <BroadcastList
        broadcasts={[
          {
            id: 'broadcast-1',
            sender: 'Organizer',
            message: 'Check this https://example.com',
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
            category: 'logistics',
            recipients: 'everyone',
            responses: { coming: 1, wait: 0, cant: 0 },
          },
        ]}
        userResponses={{}}
        onRespond={vi.fn()}
      />,
    );

    expect(screen.getByText('Example title')).toBeInTheDocument();
    expect(screen.getByText('Example description')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });
});
