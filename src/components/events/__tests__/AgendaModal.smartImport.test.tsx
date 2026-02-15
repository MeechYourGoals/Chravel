import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgendaModal } from '../AgendaModal';

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

const consumerSubscriptionMock = vi.fn();
vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => consumerSubscriptionMock(),
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
    maxFiles: 10,
    remainingSlots: 10,
    canUpload: false,
    formatFileSize: () => '0 B',
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

describe('AgendaModal smart import visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows enabled Smart Import for paid organizers', () => {
    consumerSubscriptionMock.mockReturnValue({
      tier: 'explorer',
      subscription: { status: 'active' },
      isSuperAdmin: false,
    });

    render(
      <AgendaModal
        eventId="event-1"
        permissions={{
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canUpload: false,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Smart Import' })).toBeInTheDocument();
  });

  it('shows locked Smart Import for free organizers', () => {
    consumerSubscriptionMock.mockReturnValue({
      tier: 'free',
      subscription: { status: 'inactive' },
      isSuperAdmin: false,
    });

    render(
      <AgendaModal
        eventId="event-1"
        permissions={{
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canUpload: false,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Smart Import' })).toBeDisabled();
  });
});
