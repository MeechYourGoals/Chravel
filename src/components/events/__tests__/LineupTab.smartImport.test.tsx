import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineupTab } from '../LineupTab';

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ isRefreshing: false, pullDistance: 0 }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../../mobile/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock('../../hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock('@/hooks/useEventLineup', () => ({
  useEventLineup: () => ({
    members: [],
    addMember: vi.fn(),
    updateMember: vi.fn(),
    deleteMember: vi.fn(),
    importMembers: vi.fn(),
  }),
}));

const consumerSubscriptionMock = vi.fn();
vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => consumerSubscriptionMock(),
}));

describe('LineupTab smart import visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows smart import for organizer paid users', () => {
    consumerSubscriptionMock.mockReturnValue({
      tier: 'explorer',
      subscription: { status: 'active' },
      isSuperAdmin: false,
    });

    render(
      <LineupTab
        eventId="event-1"
        isOrganizer={true}
        permissions={{ canView: true, canCreate: false, canEdit: false, canDelete: false }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Smart Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Line-up' })).toBeInTheDocument();
  });

  it('shows locked smart import for organizer free users', () => {
    consumerSubscriptionMock.mockReturnValue({
      tier: 'free',
      subscription: { status: 'inactive' },
      isSuperAdmin: false,
    });

    render(
      <LineupTab
        eventId="event-1"
        isOrganizer={true}
        permissions={{ canView: true, canCreate: false, canEdit: false, canDelete: false }}
      />,
    );

    const smartImportButton = screen.getByRole('button', { name: 'Smart Import' });
    expect(smartImportButton).toBeDisabled();
  });
});
