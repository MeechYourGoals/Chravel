import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LineupTab } from '../LineupTab';

const useEventLineupMock = vi.fn();
const useEventLineupFilesMock = vi.fn();

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false, isLoading: false }),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ isRefreshing: false, pullDistance: 0 }),
}));

vi.mock('../mobile/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock('@/hooks/useEventLineup', () => ({
  useEventLineup: (...args: unknown[]) => useEventLineupMock(...args),
}));

vi.mock('@/hooks/useEventLineupFiles', () => ({
  useEventLineupFiles: (...args: unknown[]) => useEventLineupFilesMock(...args),
}));

vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => ({
    tier: 'explorer',
    subscription: { status: 'active' },
    isSuperAdmin: false,
  }),
}));

vi.mock('../LineupImportModal', () => ({
  LineupImportModal: () => null,
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

    useEventLineupMock.mockReturnValue({
      members: [],
      addMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      importMembers: vi.fn(),
    });

    useEventLineupFilesMock.mockReturnValue({
      files: [
        {
          id: 'file-1',
          name: 'speaker-sheet.jpg',
          storagePath: 'event-1/lineup-files/file-1.jpg',
          publicUrl: 'https://example.com/speaker-sheet.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
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
      formatFileSize: (bytes: number) => `${bytes} B`,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps "Add more" upload interaction working while Add to Line-up form is open', async () => {
    const user = userEvent.setup();
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    render(<LineupTab eventId="event-1" permissions={defaultPermissions} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.type(screen.getByPlaceholderText('Bio (optional)'), 'Editing lineup bio');
    await user.click(screen.getByRole('button', { name: /Add more \(4 remaining\)/i }));

    expect(inputClickSpy).toHaveBeenCalledTimes(1);
  });
});
