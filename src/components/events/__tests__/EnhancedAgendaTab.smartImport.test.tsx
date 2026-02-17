import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { EnhancedAgendaTab } from '../EnhancedAgendaTab';

const mockUseConsumerSubscription = vi.fn();

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    isRefreshing: false,
    pullDistance: 0,
  }),
}));

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => mockUseConsumerSubscription(),
}));

vi.mock('@/hooks/useEventAgenda', () => ({
  useEventAgenda: () => ({
    sessions: [],
    addSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    bulkAddSessions: vi.fn().mockResolvedValue({ imported: 0, failed: 0 }),
    isAdding: false,
    isUpdating: false,
  }),
}));

vi.mock('@/hooks/useEventAgendaFiles', () => ({
  useEventAgendaFiles: () => ({
    files: [],
    isLoading: false,
    isUploading: false,
    uploadError: null,
    loadError: null,
    clearError: vi.fn(),
    uploadFiles: vi.fn(),
    deleteFile: vi.fn(),
    maxFiles: 5,
    remainingSlots: 0,
    canUpload: false,
    formatFileSize: (bytes: number) =>
      bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`,
  }),
}));

vi.mock('@/features/calendar/hooks/useBackgroundAgendaImport', () => ({
  useBackgroundAgendaImport: () => ({
    pendingResult: null,
    startImport: vi.fn(),
    clearResult: vi.fn(),
  }),
}));

vi.mock('../AgendaImportModal', () => ({
  AgendaImportModal: () => null,
}));

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

describe('EnhancedAgendaTab Smart Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows enabled Import Agenda button when organizer has paid access', () => {
    mockUseConsumerSubscription.mockReturnValue({
      tier: 'explorer',
      subscription: { status: 'active' },
      isSuperAdmin: false,
    });

    render(<EnhancedAgendaTab eventId="evt-1" userRole="organizer" />, {
      wrapper: createWrapper(),
    });

    const importButton = screen.getByRole('button', { name: /Smart Import/i });
    expect(importButton).toBeInTheDocument();
    expect(importButton).not.toBeDisabled();
  });

  it('shows disabled Import Agenda button when organizer lacks paid access', () => {
    mockUseConsumerSubscription.mockReturnValue({
      tier: 'free',
      subscription: { status: 'inactive' },
      isSuperAdmin: false,
    });

    render(<EnhancedAgendaTab eventId="evt-1" userRole="organizer" />, {
      wrapper: createWrapper(),
    });

    const importButton = screen.getByRole('button', { name: /Smart Import/i });
    expect(importButton).toBeInTheDocument();
    expect(importButton).toBeDisabled();
  });

  it('does not show Import Agenda button when user is attendee', () => {
    mockUseConsumerSubscription.mockReturnValue({
      tier: 'explorer',
      subscription: { status: 'active' },
      isSuperAdmin: false,
    });

    render(<EnhancedAgendaTab eventId="evt-1" userRole="attendee" />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /Smart Import/i })).not.toBeInTheDocument();
  });
});
