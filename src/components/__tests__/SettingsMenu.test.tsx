import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { SettingsMenu } from '../SettingsMenu';

// Keep this test intentionally lightweight:
// - It protects against runtime crashes (e.g., ReferenceError) when opening Settings.
// - We mock heavy child panels + external-context hooks to keep it stable.

vi.mock('../ConsumerSettings', () => ({
  ConsumerSettings: () => <div data-testid="consumer-settings" />,
}));

vi.mock('../EnterpriseSettings', () => ({
  EnterpriseSettings: () => <div data-testid="enterprise-settings" />,
}));

vi.mock('../EventsSettings', () => ({
  EventsSettings: () => <div data-testid="events-settings" />,
}));

vi.mock('../ProUpgradeModal', () => ({
  ProUpgradeModal: () => null,
}));

vi.mock('../AuthModal', () => ({
  AuthModal: () => null,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../hooks/useDemoMode', () => ({
  useDemoMode: () => ({ demoView: 'off' }),
}));

vi.mock('../../hooks/useSuperAdmin', () => ({
  useSuperAdmin: () => ({ isSuperAdmin: false }),
}));

vi.mock('../../contexts/TripVariantContext', () => ({
  useTripVariant: () => ({ variant: 'consumer' }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('SettingsMenu', () => {
  it('renders for an authenticated user without crashing', () => {
    render(
      <MemoryRouter>
        <SettingsMenu isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    // Basic smoke assertions: header + tabs render.
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consumer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enterprise' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Events' })).toBeInTheDocument();

    // Default tab should mount without throwing.
    expect(screen.getByTestId('consumer-settings')).toBeInTheDocument();
  });
});
