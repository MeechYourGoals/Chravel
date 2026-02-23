import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AgendaModal } from '../AgendaModal';

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false, isLoading: false }),
}));

vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => ({
    tier: 'explorer',
    subscription: { status: 'active' },
    isSuperAdmin: false,
  }),
}));

vi.mock('@/hooks/useEventAgenda', () => ({
  useEventAgenda: () => ({
    sessions: [],
    addSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
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
    remainingSlots: 5,
    canUpload: true,
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

const defaultPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canUpload: true,
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

describe('AgendaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state boxes', () => {
    it('renders No Sessions Yet when sessions are empty', () => {
      render(<AgendaModal eventId="evt-1" permissions={defaultPermissions} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No Sessions Yet')).toBeInTheDocument();
      expect(screen.getByText(/Add sessions to build your event schedule/i)).toBeInTheDocument();
    });

    it('renders No Agenda Files when agenda files are empty', () => {
      render(<AgendaModal eventId="evt-1" permissions={defaultPermissions} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No Agenda Files')).toBeInTheDocument();
      // Using a regex that is more tolerant to whitespace
      expect(
        screen.getByText(/Upload PDFs or images of your event agenda/i),
      ).toBeInTheDocument();
    });

    it('does not render redundant Upload Files button inside No Agenda Files box', () => {
      render(<AgendaModal eventId="evt-1" permissions={defaultPermissions} />, {
        wrapper: createWrapper(),
      });

      // Use regex to match "Upload" case-insensitive
      const uploadTexts = screen.getAllByText(/Upload/i);
      expect(uploadTexts.length).toBeGreaterThan(0);
      expect(screen.queryByText('Upload Files')).not.toBeInTheDocument();
    });

    it('renders both empty-state cards with equal min-height for desktop parity', () => {
      const { container } = render(
        <AgendaModal eventId="evt-1" permissions={defaultPermissions} />,
        { wrapper: createWrapper() },
      );

      const cards = container.querySelectorAll('[class*="min-h-[220px]"]');
      expect(cards.length).toBe(2);
    });
  });
});
