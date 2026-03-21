import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LineupTab } from '../LineupTab';

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false, isLoading: false }),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ isRefreshing: false, pullDistance: 0 }),
}));

vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => ({
    tier: 'explorer',
    subscription: { status: 'active' },
    isSuperAdmin: false,
  }),
}));

vi.mock('@/utils/paidAccess', () => ({
  hasPaidAccess: () => false,
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

vi.mock('@/hooks/useEventLineupFiles', () => ({
  useEventLineupFiles: () => ({
    files: [
      {
        id: 'file-1',
        name: 'speaker-card.jpg',
        storagePath: 'event-1/lineup-files/speaker-card.jpg',
        publicUrl: 'https://example.com/speaker-card.jpg',
        mimeType: 'image/jpeg',
        size: 19_500,
        createdAt: '2026-03-19T00:00:00.000Z',
      },
    ],
    isLoading: false,
    isUploading: false,
    uploadError: null,
    loadError: null,
    clearError: vi.fn(),
    uploadFiles: vi.fn(),
    deleteFile: vi.fn(),
    maxFiles: 5,
    remainingSlots: 4,
    canUpload: true,
    canUploadMore: true,
    formatFileSize: (bytes: number) =>
      bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`,
  }),
}));

vi.mock('../LineupImportModal', () => ({
  LineupImportModal: () => null,
}));

vi.mock('../../mobile/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

const defaultPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('LineupTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps Add more upload wired while Add to Line-up form is open', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <LineupTab
        eventId="event-1"
        permissions={defaultPermissions}
        agendaSessions={[]}
        initialSpeakers={[]}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(screen.getByRole('button', { name: /^Add$/i }));
    expect(screen.getByRole('heading', { name: 'Add to Line-up' })).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const clickSpy = vi.spyOn(fileInput!, 'click');
    await user.click(screen.getByRole('button', { name: /Add more/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
